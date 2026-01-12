//! Process Manager for Claude CLI sessions
//!
//! This module handles spawning and managing Claude CLI processes.
//!
//! IMPORTANT: Claude CLI uses a spawn-per-prompt model:
//! - Each prompt spawns a NEW process with `-p "<prompt>"`
//! - Multi-turn conversations use `--resume <session_id>`
//! - The session_id is returned in the first `system` message
//! - There is NO persistent stdin/stdout communication

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::{mpsc, Mutex, RwLock};

use super::parser::{StreamJsonParser, StreamMessage};

/// Errors that can occur during process management
#[derive(Error, Debug)]
pub enum ProcessError {
    #[error("Session not found: {0}")]
    SessionNotFound(String),
    #[error("Failed to spawn process: {0}")]
    SpawnFailed(#[from] std::io::Error),
    #[error("Session already exists: {0}")]
    SessionExists(String),
    #[error("Session is busy processing another prompt")]
    SessionBusy,
    #[error("Invalid working directory: {0}")]
    InvalidWorkingDir(PathBuf),
    #[error("Process terminated unexpectedly")]
    ProcessTerminated,
}

/// Configuration for spawning a new session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionConfig {
    pub working_dir: PathBuf,
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default)]
    pub allowed_tools: Vec<String>,
}

fn default_model() -> String {
    "sonnet".to_string()
}

/// Status of a session
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SessionStatus {
    Idle,
    Thinking,
    Error,
    Terminated,
}

/// Information about a session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub id: String,
    pub claude_session_id: Option<String>, // The actual Claude CLI session ID for --resume
    pub working_dir: PathBuf,
    pub model: String,
    pub status: SessionStatus,
    pub created_at: u64,
    pub prompt_count: u32,
    pub total_cost_usd: f64,
}

/// Internal session state
struct Session {
    info: SessionInfo,
    config: SessionConfig,
    active_process: Option<Child>,
}

/// Manager for Claude CLI processes
///
/// This manager uses the spawn-per-prompt model:
/// - `create_session()` - Creates a logical session (no process spawned yet)
/// - `send_prompt()` - Spawns a Claude CLI process for this prompt
/// - Each process uses `--resume` if there's a previous claude_session_id
pub struct ProcessManager {
    sessions: Arc<RwLock<HashMap<String, Arc<Mutex<Session>>>>>,
}

impl ProcessManager {
    /// Create a new process manager
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Create a new logical session (does NOT spawn Claude CLI yet)
    ///
    /// Returns the app session ID. The actual Claude CLI process is spawned
    /// when `send_prompt()` is called.
    pub async fn create_session(
        &self,
        config: SessionConfig,
    ) -> Result<String, ProcessError> {
        // Validate working directory
        if !config.working_dir.exists() {
            return Err(ProcessError::InvalidWorkingDir(config.working_dir.clone()));
        }

        let session_id = uuid::Uuid::new_v4().to_string();

        // Check if session already exists
        if self.sessions.read().await.contains_key(&session_id) {
            return Err(ProcessError::SessionExists(session_id));
        }

        // Create session info
        let info = SessionInfo {
            id: session_id.clone(),
            claude_session_id: None, // Will be set after first prompt
            working_dir: config.working_dir.clone(),
            model: config.model.clone(),
            status: SessionStatus::Idle,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            prompt_count: 0,
            total_cost_usd: 0.0,
        };

        // Store the session
        let session = Session {
            info,
            config,
            active_process: None,
        };

        self.sessions
            .write()
            .await
            .insert(session_id.clone(), Arc::new(Mutex::new(session)));

        Ok(session_id)
    }

    /// Send a prompt to a session - spawns a NEW Claude CLI process
    ///
    /// This is the spawn-per-prompt model:
    /// 1. Spawn: `claude -p "<prompt>" --output-format stream-json [--resume <id>]`
    /// 2. Stream the JSON output via the returned receiver
    /// 3. Process terminates when done
    /// 4. Extract session_id from `system` message for next --resume
    pub async fn send_prompt(
        &self,
        session_id: &str,
        prompt: &str,
        output_tx: mpsc::Sender<StreamMessage>,
    ) -> Result<(), ProcessError> {
        let sessions = self.sessions.read().await;
        let session_arc = sessions
            .get(session_id)
            .ok_or_else(|| ProcessError::SessionNotFound(session_id.to_string()))?
            .clone();
        drop(sessions); // Release read lock

        let mut session = session_arc.lock().await;

        // Check if session is busy
        if session.info.status == SessionStatus::Thinking {
            return Err(ProcessError::SessionBusy);
        }

        // Build the command arguments
        let mut args: Vec<String> = vec![
            "-p".to_string(),
            prompt.to_string(),
            "--output-format".to_string(),
            "stream-json".to_string(),
        ];

        // Add --resume if we have a previous claude session ID
        if let Some(ref claude_id) = session.info.claude_session_id {
            args.push("--resume".to_string());
            args.push(claude_id.clone());
        }

        // Add model
        args.push("--model".to_string());
        args.push(session.config.model.clone());

        // Add allowed tools if any
        if !session.config.allowed_tools.is_empty() {
            args.push("--allowedTools".to_string());
            args.push(session.config.allowed_tools.join(","));
        }

        log::info!(
            "Spawning Claude CLI for session {} with args: {:?}",
            session_id,
            args
        );

        // Spawn the process
        let mut child = Command::new("claude")
            .args(&args)
            .current_dir(&session.config.working_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;

        let stdout = child.stdout.take().expect("Failed to get stdout");

        // Update session state
        session.info.status = SessionStatus::Thinking;
        session.info.prompt_count += 1;
        session.active_process = Some(child);

        // Clone what we need for the async task
        let session_id_for_task = session_id.to_string();
        let sessions_for_task = self.sessions.clone();

        // Spawn task to handle stdout parsing
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout);
            let mut parser = StreamJsonParser::new();
            let mut line = String::new();

            loop {
                line.clear();
                match reader.read_line(&mut line).await {
                    Ok(0) => {
                        // EOF - flush any remaining content
                        if let Some(msg) = parser.flush() {
                            let _ = output_tx.send(msg).await;
                        }
                        break;
                    }
                    Ok(_) => {
                        for msg in parser.parse_chunk(line.as_bytes()) {
                            // Extract claude_session_id from system message
                            if let StreamMessage::System { session_id: Some(ref claude_id), .. } = msg {
                                // Update the session with the claude session ID
                                if let Some(session_arc) = sessions_for_task.read().await.get(&session_id_for_task) {
                                    let mut session = session_arc.lock().await;
                                    if session.info.claude_session_id.is_none() {
                                        session.info.claude_session_id = Some(claude_id.clone());
                                        log::info!(
                                            "Captured Claude session ID: {} for app session {}",
                                            claude_id,
                                            session_id_for_task
                                        );
                                    }
                                }
                            }

                            // Extract cost from result message
                            if let StreamMessage::Result { cost_usd, .. } = msg {
                                if let Some(cost) = cost_usd {
                                    if let Some(session_arc) = sessions_for_task.read().await.get(&session_id_for_task) {
                                        let mut session = session_arc.lock().await;
                                        session.info.total_cost_usd += cost;
                                    }
                                }
                            }

                            if output_tx.send(msg).await.is_err() {
                                log::warn!("Output channel closed for session {}", session_id_for_task);
                                break;
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("Error reading stdout: {}", e);
                        break;
                    }
                }
            }

            // Update session status when process completes
            if let Some(session_arc) = sessions_for_task.read().await.get(&session_id_for_task) {
                let mut session = session_arc.lock().await;
                session.info.status = SessionStatus::Idle;
                session.active_process = None;
            }
        });

        Ok(())
    }

    /// Interrupt the current Claude process (kills it)
    pub async fn interrupt(&self, session_id: &str) -> Result<(), ProcessError> {
        let sessions = self.sessions.read().await;
        let session_arc = sessions
            .get(session_id)
            .ok_or_else(|| ProcessError::SessionNotFound(session_id.to_string()))?;

        let mut session = session_arc.lock().await;

        if let Some(ref mut child) = session.active_process {
            log::info!("Interrupting Claude process for session {}", session_id);
            let _ = child.kill().await;
            session.active_process = None;
            session.info.status = SessionStatus::Idle;
        }

        Ok(())
    }

    /// Terminate a session and clean up
    pub async fn terminate(&self, session_id: &str) -> Result<(), ProcessError> {
        let mut sessions = self.sessions.write().await;

        if let Some(session_arc) = sessions.remove(session_id) {
            let mut session = session_arc.lock().await;
            if let Some(ref mut child) = session.active_process {
                let _ = child.kill().await;
            }
            session.info.status = SessionStatus::Terminated;
        }

        Ok(())
    }

    /// Check if a session is alive
    pub async fn is_alive(&self, session_id: &str) -> bool {
        let sessions = self.sessions.read().await;
        if let Some(session_arc) = sessions.get(session_id) {
            let session = session_arc.lock().await;
            session.info.status != SessionStatus::Terminated
        } else {
            false
        }
    }

    /// Get the number of active sessions
    pub async fn active_count(&self) -> usize {
        self.sessions.read().await.len()
    }

    /// Get information about all active sessions
    pub async fn get_sessions(&self) -> Vec<SessionInfo> {
        let sessions = self.sessions.read().await;
        let mut infos = Vec::new();
        for session_arc in sessions.values() {
            let session = session_arc.lock().await;
            infos.push(session.info.clone());
        }
        infos
    }

    /// Get information about a specific session
    pub async fn get_session(&self, session_id: &str) -> Option<SessionInfo> {
        let sessions = self.sessions.read().await;
        if let Some(session_arc) = sessions.get(session_id) {
            let session = session_arc.lock().await;
            Some(session.info.clone())
        } else {
            None
        }
    }

    /// Update session status
    pub async fn set_status(
        &self,
        session_id: &str,
        status: SessionStatus,
    ) -> Result<(), ProcessError> {
        let sessions = self.sessions.read().await;
        let session_arc = sessions
            .get(session_id)
            .ok_or_else(|| ProcessError::SessionNotFound(session_id.to_string()))?;

        let mut session = session_arc.lock().await;
        session.info.status = status;

        Ok(())
    }

    /// Terminate all sessions
    pub async fn terminate_all(&self) {
        let mut sessions = self.sessions.write().await;
        for (_, session_arc) in sessions.drain() {
            let mut session = session_arc.lock().await;
            if let Some(ref mut child) = session.active_process {
                let _ = child.kill().await;
            }
        }
    }
}

impl Default for ProcessManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_config() -> (SessionConfig, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let config = SessionConfig {
            working_dir: temp_dir.path().to_path_buf(),
            model: "sonnet".to_string(),
            allowed_tools: vec![],
        };
        (config, temp_dir)
    }

    #[tokio::test]
    async fn test_new_manager() {
        let manager = ProcessManager::new();
        assert_eq!(manager.active_count().await, 0);
    }

    #[tokio::test]
    async fn test_create_session() {
        let manager = ProcessManager::new();
        let (config, _temp_dir) = create_test_config();

        let result = manager.create_session(config).await;
        assert!(result.is_ok());

        let session_id = result.unwrap();
        assert!(!session_id.is_empty());
        assert_eq!(manager.active_count().await, 1);
    }

    #[tokio::test]
    async fn test_invalid_working_dir() {
        let manager = ProcessManager::new();
        let config = SessionConfig {
            working_dir: PathBuf::from("/nonexistent/path/that/does/not/exist"),
            model: "sonnet".to_string(),
            allowed_tools: vec![],
        };

        let result = manager.create_session(config).await;
        assert!(matches!(result, Err(ProcessError::InvalidWorkingDir(_))));
    }

    #[tokio::test]
    async fn test_session_not_found_interrupt() {
        let manager = ProcessManager::new();

        let result = manager.interrupt("nonexistent-session").await;
        assert!(matches!(result, Err(ProcessError::SessionNotFound(_))));
    }

    #[tokio::test]
    async fn test_terminate_nonexistent_is_ok() {
        let manager = ProcessManager::new();

        // Terminating a non-existent session should not error
        let result = manager.terminate("nonexistent-session").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_is_alive_nonexistent() {
        let manager = ProcessManager::new();
        assert!(!manager.is_alive("nonexistent-session").await);
    }

    #[tokio::test]
    async fn test_get_sessions_empty() {
        let manager = ProcessManager::new();
        let sessions = manager.get_sessions().await;
        assert!(sessions.is_empty());
    }

    #[tokio::test]
    async fn test_terminate_all_empty() {
        let manager = ProcessManager::new();
        manager.terminate_all().await;
        assert_eq!(manager.active_count().await, 0);
    }

    #[tokio::test]
    async fn test_session_info_after_create() {
        let manager = ProcessManager::new();
        let (config, _temp_dir) = create_test_config();

        let session_id = manager.create_session(config.clone()).await.unwrap();
        let info = manager.get_session(&session_id).await;

        assert!(info.is_some());
        let info = info.unwrap();
        assert_eq!(info.id, session_id);
        assert_eq!(info.model, "sonnet");
        assert_eq!(info.status, SessionStatus::Idle);
        assert!(info.claude_session_id.is_none()); // No Claude session until first prompt
        assert_eq!(info.prompt_count, 0);
        assert_eq!(info.total_cost_usd, 0.0);
    }

    #[tokio::test]
    async fn test_terminate_removes_session() {
        let manager = ProcessManager::new();
        let (config, _temp_dir) = create_test_config();

        let session_id = manager.create_session(config).await.unwrap();
        assert_eq!(manager.active_count().await, 1);

        manager.terminate(&session_id).await.unwrap();
        assert_eq!(manager.active_count().await, 0);
    }
}
