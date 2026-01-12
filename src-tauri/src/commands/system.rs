//! System commands for paths, directories, and git operations

use std::process::Command;
use tauri::Manager;

/// Get the app data directory path
#[tauri::command]
pub async fn get_app_data_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Ensure directory exists
    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create app data dir: {}", e))?;

    Ok(path.to_string_lossy().to_string())
}

/// Get the user's home directory
#[tauri::command]
pub async fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Failed to get home directory".to_string())
}

/// Get the current git branch name
#[tauri::command]
pub async fn git_current_branch(dir: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(&dir)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err("Not a git repository or git not installed".to_string())
    }
}

/// Get uncommitted changes (git diff)
#[tauri::command]
pub async fn git_diff(dir: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["diff"])
        .current_dir(&dir)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Get git status (short format)
#[tauri::command]
pub async fn git_status(dir: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["status", "--short"])
        .current_dir(&dir)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Get staged changes (git diff --cached)
#[tauri::command]
pub async fn git_staged(dir: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["diff", "--cached"])
        .current_dir(&dir)
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Open a file in VS Code
#[tauri::command]
pub async fn open_in_vscode(path: String, line: Option<u32>) -> Result<(), String> {
    let mut args = vec![path.clone()];

    if let Some(line_num) = line {
        args.push(format!("--goto={}:{}", path, line_num));
    }

    Command::new("code")
        .args(&args)
        .spawn()
        .map_err(|e| format!("Failed to open VS Code: {}", e))?;

    Ok(())
}

/// Open a diff view in VS Code
#[tauri::command]
pub async fn open_diff_in_vscode(
    _path: String,
    original: String,
    modified: String,
) -> Result<(), String> {
    use std::io::Write;

    // Create temp files for the diff
    let temp_dir = std::env::temp_dir();
    let orig_path = temp_dir.join("original_diff.txt");
    let mod_path = temp_dir.join("modified_diff.txt");

    let mut orig_file = std::fs::File::create(&orig_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    orig_file
        .write_all(original.as_bytes())
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    let mut mod_file = std::fs::File::create(&mod_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    mod_file
        .write_all(modified.as_bytes())
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    Command::new("code")
        .args([
            "--diff",
            orig_path.to_str().unwrap(),
            mod_path.to_str().unwrap(),
        ])
        .spawn()
        .map_err(|e| format!("Failed to open VS Code diff: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_home_dir() {
        let result = get_home_dir().await;
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(!path.is_empty());
    }

    #[tokio::test]
    async fn test_git_current_branch_in_non_git_dir() {
        let temp_dir = std::env::temp_dir();
        let result = git_current_branch(temp_dir.to_string_lossy().to_string()).await;
        // Should fail in temp dir which is not a git repo
        assert!(result.is_err());
    }
}
