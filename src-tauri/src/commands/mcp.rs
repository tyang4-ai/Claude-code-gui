//! MCP (Model Context Protocol) commands
//!
//! This module provides Tauri commands for MCP server management:
//! - Reading MCP configuration files
//! - Starting/stopping MCP servers
//! - Health checking
//! - Fetching capabilities

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use thiserror::Error;
use tokio::fs;

/// Errors that can occur during MCP operations
#[derive(Error, Debug, Serialize)]
pub enum MCPError {
    #[error("Configuration file not found: {0}")]
    ConfigNotFound(String),
    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
    #[error("Failed to start server: {0}")]
    StartFailed(String),
    #[error("Failed to stop server: {0}")]
    StopFailed(String),
    #[error("Server not found: {0}")]
    ServerNotFound(String),
    #[error("IO error: {0}")]
    IoError(String),
    #[error("Process error: {0}")]
    ProcessError(String),
}

impl From<std::io::Error> for MCPError {
    fn from(e: std::io::Error) -> Self {
        MCPError::IoError(e.to_string())
    }
}

/// MCP configuration file structure
#[derive(Debug, Serialize, Deserialize)]
pub struct MCPConfigFile {
    #[serde(rename = "mcpServers", skip_serializing_if = "Option::is_none")]
    pub mcp_servers: Option<std::collections::HashMap<String, MCPServerConfigFile>>,
}

/// Server configuration in file
#[derive(Debug, Serialize, Deserialize)]
pub struct MCPServerConfigFile {
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<std::collections::HashMap<String, String>>,
    pub url: Option<String>,
    pub headers: Option<std::collections::HashMap<String, String>>,
    pub disabled: Option<bool>,
}

/// Server capabilities response
#[derive(Debug, Serialize, Deserialize)]
pub struct MCPCapabilities {
    pub tools: Vec<MCPTool>,
    pub resources: Vec<MCPResource>,
    pub prompts: Vec<MCPPrompt>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MCPTool {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MCPResource {
    pub uri: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MCPPrompt {
    pub name: String,
    pub description: Option<String>,
}

/// Read MCP configuration from a file
#[tauri::command]
pub async fn read_mcp_config(path: String) -> Result<String, MCPError> {
    let content = fs::read_to_string(&path).await.map_err(|_| {
        MCPError::ConfigNotFound(path.clone())
    })?;
    Ok(content)
}

/// Write MCP configuration to a file
#[tauri::command]
pub async fn write_mcp_config(path: String, content: String) -> Result<(), MCPError> {
    let path_buf = PathBuf::from(&path);

    // Create parent directories if they don't exist
    if let Some(parent) = path_buf.parent() {
        fs::create_dir_all(parent).await?;
    }

    fs::write(&path_buf, content).await?;
    Ok(())
}

/// Check if MCP config file exists
#[tauri::command]
pub async fn mcp_config_exists(path: String) -> Result<bool, MCPError> {
    Ok(PathBuf::from(path).exists())
}

/// Get default MCP config paths
#[tauri::command]
pub async fn get_mcp_config_paths(working_dir: String) -> Result<Vec<String>, MCPError> {
    let home_dir = dirs::home_dir()
        .ok_or_else(|| MCPError::IoError("Cannot determine home directory".to_string()))?;

    let paths = vec![
        // User scope
        home_dir
            .join(".claude")
            .join("claude_desktop_config.json")
            .to_string_lossy()
            .to_string(),
        // Project scope
        PathBuf::from(&working_dir)
            .join(".mcp.json")
            .to_string_lossy()
            .to_string(),
        PathBuf::from(&working_dir)
            .join(".claude")
            .join("mcp.json")
            .to_string_lossy()
            .to_string(),
    ];

    Ok(paths)
}

/// Start an MCP server (stdio transport)
#[tauri::command]
pub async fn start_mcp_server(
    name: String,
    command: String,
    args: Vec<String>,
    env: Option<std::collections::HashMap<String, String>>,
) -> Result<u32, MCPError> {
    let mut cmd = Command::new(&command);
    cmd.args(&args);
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    // Set environment variables
    if let Some(env_vars) = env {
        for (key, value) in env_vars {
            cmd.env(key, value);
        }
    }

    let child = cmd.spawn().map_err(|e| {
        MCPError::StartFailed(format!("Failed to spawn process for {}: {}", name, e))
    })?;

    let pid = child.id();

    // TODO: Store the child process handle for management
    // For now, we just return the PID

    Ok(pid)
}

/// Stop an MCP server by PID
#[tauri::command]
pub async fn stop_mcp_server(pid: u32) -> Result<(), MCPError> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        Command::new("taskkill")
            .args(&["/PID", &pid.to_string(), "/F"])
            .output()
            .map_err(|e| MCPError::StopFailed(e.to_string()))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        use nix::sys::signal::{kill, Signal};
        use nix::unistd::Pid;

        let pid = Pid::from_raw(pid as i32);
        kill(pid, Signal::SIGTERM)
            .map_err(|e| MCPError::StopFailed(e.to_string()))?;
    }

    Ok(())
}

/// Check if a process is running
#[tauri::command]
pub async fn is_process_running(pid: u32) -> Result<bool, MCPError> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let output = Command::new("tasklist")
            .args(&["/FI", &format!("PID eq {}", pid), "/NH"])
            .output()
            .map_err(|e| MCPError::ProcessError(e.to_string()))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.contains(&pid.to_string()))
    }

    #[cfg(not(target_os = "windows"))]
    {
        use nix::sys::signal::{kill, Signal};
        use nix::unistd::Pid;

        let pid = Pid::from_raw(pid as i32);
        match kill(pid, Signal::from_c_int(0)) {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }
}

/// Health check for HTTP/SSE MCP servers
#[tauri::command]
pub async fn health_check_mcp_server(url: String) -> Result<bool, MCPError> {
    // Simple HTTP GET to check if server is responding
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| MCPError::ProcessError(e.to_string()))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| MCPError::ProcessError(e.to_string()))?;

    Ok(response.status().is_success())
}

/// Fetch capabilities from an MCP server (mock implementation)
#[tauri::command]
pub async fn fetch_mcp_capabilities(
    _server_name: String,
) -> Result<MCPCapabilities, MCPError> {
    // TODO: Implement actual MCP protocol communication
    // For now, return empty capabilities
    Ok(MCPCapabilities {
        tools: vec![],
        resources: vec![],
        prompts: vec![],
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_read_mcp_config() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("config.json");

        let config = r#"{"mcpServers": {}}"#;
        std::fs::write(&path, config).unwrap();

        let result = read_mcp_config(path.to_string_lossy().to_string()).await.unwrap();
        assert_eq!(result, config);
    }

    #[tokio::test]
    async fn test_read_nonexistent_config() {
        let result = read_mcp_config("/nonexistent/config.json".to_string()).await;
        assert!(matches!(result, Err(MCPError::ConfigNotFound(_))));
    }

    #[tokio::test]
    async fn test_write_mcp_config() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("config.json");

        let config = r#"{"mcpServers": {}}"#;
        write_mcp_config(path.to_string_lossy().to_string(), config.to_string())
            .await
            .unwrap();

        assert_eq!(std::fs::read_to_string(&path).unwrap(), config);
    }

    #[tokio::test]
    async fn test_mcp_config_exists() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("config.json");

        assert!(!mcp_config_exists(path.to_string_lossy().to_string()).await.unwrap());

        std::fs::write(&path, "{}").unwrap();
        assert!(mcp_config_exists(path.to_string_lossy().to_string()).await.unwrap());
    }

    #[tokio::test]
    async fn test_get_mcp_config_paths() {
        let paths = get_mcp_config_paths("/test/dir".to_string()).await.unwrap();
        assert!(paths.len() >= 3);
        assert!(paths[0].contains(".claude"));
    }
}
