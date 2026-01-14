//! File operation commands
//!
//! This module provides Tauri commands for file operations including
//! atomic writes for the Edit Arbiter system.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::Path;
use thiserror::Error;
use tokio::fs;

/// Errors that can occur during file operations
#[derive(Error, Debug, Serialize)]
pub enum FileError {
    #[error("File not found: {0}")]
    NotFound(String),
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    #[error("IO error: {0}")]
    IoError(String),
    #[error("File was modified externally")]
    ConflictDetected,
}

impl From<std::io::Error> for FileError {
    fn from(e: std::io::Error) -> Self {
        match e.kind() {
            std::io::ErrorKind::NotFound => FileError::NotFound(e.to_string()),
            std::io::ErrorKind::PermissionDenied => FileError::PermissionDenied(e.to_string()),
            _ => FileError::IoError(e.to_string()),
        }
    }
}

/// Result of a file read operation
#[derive(Debug, Serialize, Deserialize)]
pub struct FileReadResult {
    pub content: String,
    pub hash: String,
}

/// Result of applying an edit
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ApplyResult {
    Success,
    Conflict {
        current_content: String,
        base_content: String,
        proposed_content: String,
    },
    Error {
        message: String,
    },
}

/// Compute SHA256 hash of content
pub fn compute_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    hex::encode(hasher.finalize())
}

/// Read a file and return its content with hash
#[tauri::command]
pub async fn read_file(path: &str) -> Result<FileReadResult, FileError> {
    let content = fs::read_to_string(path).await?;
    let hash = compute_hash(&content);
    Ok(FileReadResult { content, hash })
}

/// Write a file atomically (write to temp, then rename)
#[tauri::command]
pub async fn write_file_atomic(path: &str, content: &str) -> Result<(), FileError> {
    let path = Path::new(path);

    // Create parent directories if they don't exist
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await?;
    }

    // Write to a temporary file first
    let temp_path = path.with_extension("tmp");
    fs::write(&temp_path, content).await?;

    // Rename to the target path (atomic on most filesystems)
    fs::rename(&temp_path, path).await?;

    Ok(())
}

/// Check if a file has been modified since we last read it
#[tauri::command]
pub async fn check_file_modified(path: &str, expected_hash: &str) -> Result<bool, FileError> {
    let content = fs::read_to_string(path).await?;
    let current_hash = compute_hash(&content);
    Ok(current_hash != expected_hash)
}

/// Apply an edit with conflict detection
#[tauri::command]
pub async fn apply_edit(
    path: &str,
    original_content: &str,
    proposed_content: &str,
) -> Result<ApplyResult, FileError> {
    // Read current file content
    let current_content = match fs::read_to_string(path).await {
        Ok(content) => content,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            // File doesn't exist - this is OK for new files
            String::new()
        }
        Err(e) => return Err(e.into()),
    };

    // Check for external modification
    if !original_content.is_empty() && current_content != original_content {
        return Ok(ApplyResult::Conflict {
            current_content,
            base_content: original_content.to_string(),
            proposed_content: proposed_content.to_string(),
        });
    }

    // Apply the edit atomically
    write_file_atomic(path, proposed_content).await?;

    Ok(ApplyResult::Success)
}

/// List files matching a glob pattern
#[tauri::command]
pub async fn list_files(dir: &str, pattern: &str) -> Result<Vec<String>, FileError> {
    use std::process::Command;

    // Use ripgrep for fast file listing that respects .gitignore
    let output = Command::new("rg")
        .args(["--files", "--glob", pattern])
        .current_dir(dir)
        .output();

    match output {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let files: Vec<String> = stdout
                .lines()
                .map(|s| s.to_string())
                .collect();
            Ok(files)
        }
        Ok(_) | Err(_) => {
            // Fallback to basic directory listing if ripgrep fails
            let mut files = Vec::new();
            list_files_recursive(Path::new(dir), pattern, &mut files).await?;
            Ok(files)
        }
    }
}

/// Recursive file listing (fallback when ripgrep unavailable)
async fn list_files_recursive(
    dir: &Path,
    pattern: &str,
    files: &mut Vec<String>,
) -> Result<(), FileError> {
    let mut entries = fs::read_dir(dir).await?;

    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        let file_name = path.file_name().unwrap_or_default().to_string_lossy();

        // Skip hidden files and common ignored directories
        if file_name.starts_with('.') || file_name == "node_modules" || file_name == "target" {
            continue;
        }

        if path.is_dir() {
            Box::pin(list_files_recursive(&path, pattern, files)).await?;
        } else {
            // Simple glob matching (just extension for now)
            let pattern_ext = pattern.trim_start_matches("*.");
            if let Some(ext) = path.extension() {
                if ext.to_string_lossy() == pattern_ext || pattern == "*" {
                    files.push(path.to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(())
}

/// Check if a file exists
#[tauri::command]
pub async fn file_exists(path: &str) -> Result<bool, FileError> {
    Ok(Path::new(path).exists())
}

/// Ensure a directory exists, creating it if necessary
#[tauri::command]
pub async fn ensure_dir(path: &str) -> Result<(), FileError> {
    fs::create_dir_all(path).await?;
    Ok(())
}

/// Delete a file
#[tauri::command]
pub async fn delete_file(path: &str) -> Result<(), FileError> {
    fs::remove_file(path).await?;
    Ok(())
}

/// Get file metadata
#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub size: u64,
    pub modified: u64,
    pub is_dir: bool,
}

#[tauri::command]
pub async fn get_file_metadata(path: &str) -> Result<FileMetadata, FileError> {
    let metadata = fs::metadata(path).await?;
    let modified = metadata
        .modified()?
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    Ok(FileMetadata {
        size: metadata.len(),
        modified,
        is_dir: metadata.is_dir(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_read_file_success() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.txt");
        std::fs::write(&path, "hello world").unwrap();

        let result = read_file(path.to_str().unwrap()).await.unwrap();
        assert_eq!(result.content, "hello world");
        assert!(!result.hash.is_empty());
    }

    #[tokio::test]
    async fn test_read_nonexistent_file_fails() {
        let result = read_file("/nonexistent/file.txt").await;
        assert!(matches!(result, Err(FileError::NotFound(_))));
    }

    #[tokio::test]
    async fn test_write_file_atomic_success() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("new.txt");

        write_file_atomic(path.to_str().unwrap(), "content")
            .await
            .unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "content");
    }

    #[tokio::test]
    async fn test_write_file_atomic_overwrites() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("existing.txt");
        std::fs::write(&path, "old").unwrap();

        write_file_atomic(path.to_str().unwrap(), "new")
            .await
            .unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "new");
    }

    #[tokio::test]
    async fn test_write_file_atomic_creates_parent_dirs() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("sub/dir/file.txt");

        write_file_atomic(path.to_str().unwrap(), "content")
            .await
            .unwrap();
        assert!(path.exists());
    }

    #[tokio::test]
    async fn test_check_file_modified_false_when_unchanged() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.txt");
        std::fs::write(&path, "content").unwrap();

        let hash = compute_hash("content");
        let modified = check_file_modified(path.to_str().unwrap(), &hash)
            .await
            .unwrap();
        assert!(!modified);
    }

    #[tokio::test]
    async fn test_check_file_modified_true_when_changed() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.txt");
        std::fs::write(&path, "original").unwrap();

        let hash = compute_hash("original");
        std::fs::write(&path, "modified").unwrap();

        let modified = check_file_modified(path.to_str().unwrap(), &hash)
            .await
            .unwrap();
        assert!(modified);
    }

    #[tokio::test]
    async fn test_apply_edit_success() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.txt");
        std::fs::write(&path, "original").unwrap();

        let result = apply_edit(path.to_str().unwrap(), "original", "new")
            .await
            .unwrap();
        assert!(matches!(result, ApplyResult::Success));
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "new");
    }

    #[tokio::test]
    async fn test_apply_edit_conflict() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.txt");
        std::fs::write(&path, "modified externally").unwrap();

        let result = apply_edit(path.to_str().unwrap(), "original", "proposed")
            .await
            .unwrap();
        assert!(matches!(result, ApplyResult::Conflict { .. }));
    }

    #[tokio::test]
    async fn test_apply_edit_new_file() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("new.txt");

        let result = apply_edit(path.to_str().unwrap(), "", "new content")
            .await
            .unwrap();
        assert!(matches!(result, ApplyResult::Success));
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "new content");
    }

    #[tokio::test]
    async fn test_file_exists() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.txt");
        std::fs::write(&path, "content").unwrap();

        assert!(file_exists(path.to_str().unwrap()).await.unwrap());
        assert!(!file_exists("/nonexistent/file.txt").await.unwrap());
    }

    #[tokio::test]
    async fn test_compute_hash() {
        let hash1 = compute_hash("hello");
        let hash2 = compute_hash("hello");
        let hash3 = compute_hash("world");

        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
    }
}
