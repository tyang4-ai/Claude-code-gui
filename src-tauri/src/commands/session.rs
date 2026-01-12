//! Session management commands
//!
//! This module provides Tauri commands for managing Claude CLI sessions.
//!
//! ARCHITECTURE: Spawn-per-prompt model
//! - `spawn_session` creates a LOGICAL session (no process spawned yet)
//! - `send_prompt` spawns a NEW Claude CLI process for each prompt
//! - Multi-turn conversations use `--resume <claude_session_id>`
//! - Messages are streamed via Tauri events

use crate::services::{ProcessManager, SessionConfig, SessionInfo, StreamMessage};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{mpsc, RwLock};

/// Application state containing the process manager
pub struct AppState {
    pub process_manager: Arc<RwLock<ProcessManager>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            process_manager: Arc::new(RwLock::new(ProcessManager::new())),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

/// Error type for session commands
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionError {
    pub message: String,
}

impl From<crate::services::ProcessError> for SessionError {
    fn from(e: crate::services::ProcessError) -> Self {
        Self {
            message: e.to_string(),
        }
    }
}

/// Result of creating a session
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSessionResult {
    pub session_id: String,
}

/// Payload for cli-message events sent to frontend
#[derive(Debug, Clone, Serialize)]
pub struct CLIMessagePayload {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub message: StreamMessage,
}

/// Create a new Claude CLI session (logical, no process spawned yet)
///
/// Returns the app session ID. The actual Claude process is spawned
/// when `send_prompt` is called.
#[tauri::command]
pub async fn spawn_session(
    state: State<'_, AppState>,
    config: SessionConfig,
) -> Result<CreateSessionResult, SessionError> {
    let manager = state.process_manager.read().await;
    let session_id = manager.create_session(config).await?;

    Ok(CreateSessionResult { session_id })
}

/// Send a prompt to a session - spawns a NEW Claude CLI process
///
/// This follows the spawn-per-prompt model:
/// 1. Creates: `claude -p "<prompt>" --output-format stream-json [--resume <id>]`
/// 2. Streams JSON messages via "cli-message" Tauri events
/// 3. Process terminates when Claude is done responding
#[tauri::command]
pub async fn send_prompt(
    app: AppHandle,
    state: State<'_, AppState>,
    session_id: String,
    prompt: String,
) -> Result<(), SessionError> {
    let manager = state.process_manager.read().await;

    // Create channel for receiving messages from the process
    let (tx, mut rx) = mpsc::channel::<StreamMessage>(64);

    // Spawn the prompt (this creates the Claude CLI process)
    manager.send_prompt(&session_id, &prompt, tx).await?;

    // Spawn a task to forward messages to the frontend via Tauri events
    let session_id_clone = session_id.clone();
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let payload = CLIMessagePayload {
                session_id: session_id_clone.clone(),
                message: msg,
            };

            if let Err(e) = app.emit("cli-message", &payload) {
                log::error!("Failed to emit cli-message event: {}", e);
                break;
            }
        }
    });

    Ok(())
}

/// Send interrupt signal to a session (kills the active Claude process)
#[tauri::command]
pub async fn send_interrupt(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), SessionError> {
    let manager = state.process_manager.read().await;
    manager.interrupt(&session_id).await?;
    Ok(())
}

/// Terminate a session and clean up
#[tauri::command]
pub async fn terminate_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<(), SessionError> {
    let manager = state.process_manager.read().await;
    manager.terminate(&session_id).await?;
    Ok(())
}

/// Get all active sessions
#[tauri::command]
pub async fn get_sessions(state: State<'_, AppState>) -> Result<Vec<SessionInfo>, SessionError> {
    let manager = state.process_manager.read().await;
    Ok(manager.get_sessions().await)
}

/// Get information about a specific session
#[tauri::command]
pub async fn get_session(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<Option<SessionInfo>, SessionError> {
    let manager = state.process_manager.read().await;
    Ok(manager.get_session(&session_id).await)
}

/// Check if a session is alive
#[tauri::command]
pub async fn is_session_alive(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<bool, SessionError> {
    let manager = state.process_manager.read().await;
    Ok(manager.is_alive(&session_id).await)
}

/// Get the number of active sessions
#[tauri::command]
pub async fn get_session_count(state: State<'_, AppState>) -> Result<usize, SessionError> {
    let manager = state.process_manager.read().await;
    Ok(manager.active_count().await)
}

/// Terminate all sessions
#[tauri::command]
pub async fn terminate_all_sessions(state: State<'_, AppState>) -> Result<(), SessionError> {
    let manager = state.process_manager.read().await;
    manager.terminate_all().await;
    Ok(())
}
