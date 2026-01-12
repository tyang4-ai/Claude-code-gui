//! Stream-JSON Parser for Claude CLI output
//!
//! This module handles parsing newline-delimited JSON (NDJSON) streams from the Claude CLI.
//! It supports partial line buffering for handling chunks split across multiple reads.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

/// Errors that can occur during stream parsing
#[derive(Error, Debug)]
pub enum ParseError {
    #[error("Invalid JSON: {0}")]
    InvalidJson(#[from] serde_json::Error),
    #[error("Unknown message type: {0}")]
    UnknownType(String),
}

/// Types of messages that can be received from the Claude CLI
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum StreamMessage {
    /// System message containing session info
    System {
        #[serde(default)]
        session_id: Option<String>,
        #[serde(flatten)]
        extra: Value,
    },
    /// Assistant message (Claude's response)
    #[serde(rename = "message")]
    Assistant {
        #[serde(default)]
        role: String,
        #[serde(default)]
        content: Value,
        #[serde(flatten)]
        extra: Value,
    },
    /// Tool use request
    ToolUse {
        id: String,
        name: String,
        #[serde(default)]
        input: Value,
        #[serde(flatten)]
        extra: Value,
    },
    /// Tool result
    ToolResult {
        tool_use_id: String,
        #[serde(default)]
        content: Value,
        #[serde(default)]
        is_error: bool,
        #[serde(flatten)]
        extra: Value,
    },
    /// Session result with cost and duration
    Result {
        #[serde(default)]
        cost_usd: Option<f64>,
        #[serde(default)]
        duration_ms: Option<u64>,
        #[serde(flatten)]
        extra: Value,
    },
    /// Error message
    Error {
        #[serde(default)]
        error: ErrorInfo,
        #[serde(flatten)]
        extra: Value,
    },
    /// Content block delta (streaming content)
    ContentBlockDelta {
        #[serde(default)]
        index: usize,
        #[serde(default)]
        delta: Value,
        #[serde(flatten)]
        extra: Value,
    },
    /// Content block start
    ContentBlockStart {
        #[serde(default)]
        index: usize,
        #[serde(default)]
        content_block: Value,
        #[serde(flatten)]
        extra: Value,
    },
    /// Content block stop
    ContentBlockStop {
        #[serde(default)]
        index: usize,
        #[serde(flatten)]
        extra: Value,
    },
    /// Unknown message type - fallback for future compatibility
    #[serde(other)]
    Unknown,
}

/// Error information from Claude CLI
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ErrorInfo {
    #[serde(default)]
    pub message: String,
    #[serde(default)]
    pub error_type: Option<String>,
}

/// A parser for stream-json output that handles partial lines
#[derive(Debug, Default)]
pub struct StreamJsonParser {
    buffer: String,
}

impl StreamJsonParser {
    /// Create a new parser instance
    pub fn new() -> Self {
        Self {
            buffer: String::new(),
        }
    }

    /// Parse a chunk of bytes, returning any complete messages
    ///
    /// This method handles partial lines by buffering incomplete data until
    /// a newline is received. It gracefully handles malformed JSON by logging
    /// and skipping bad lines.
    pub fn parse_chunk(&mut self, chunk: &[u8]) -> Vec<StreamMessage> {
        // Convert bytes to string, handling potential UTF-8 errors
        let chunk_str = match std::str::from_utf8(chunk) {
            Ok(s) => s,
            Err(e) => {
                log::warn!("Invalid UTF-8 in chunk: {}", e);
                return vec![];
            }
        };

        self.buffer.push_str(chunk_str);
        let mut messages = Vec::new();

        // Process all complete lines
        while let Some(newline_pos) = self.buffer.find('\n') {
            let line = self.buffer[..newline_pos].trim();

            // Handle both LF and CRLF
            let line = line.trim_end_matches('\r');

            if !line.is_empty() {
                match self.parse_line(line) {
                    Ok(msg) => messages.push(msg),
                    Err(e) => {
                        log::warn!("Failed to parse line: {} - Error: {}", line, e);
                    }
                }
            }

            // Remove the processed line from the buffer
            self.buffer = self.buffer[newline_pos + 1..].to_string();
        }

        messages
    }

    /// Parse a single line of JSON
    fn parse_line(&self, line: &str) -> Result<StreamMessage, ParseError> {
        // First try to parse as known message types
        match serde_json::from_str::<StreamMessage>(line) {
            Ok(msg) => Ok(msg),
            Err(_) => {
                // Try parsing as generic JSON and wrap in Unknown
                let value: Value = serde_json::from_str(line)?;
                log::debug!("Parsed unknown message type: {:?}", value.get("type"));
                Ok(StreamMessage::Unknown)
            }
        }
    }

    /// Flush any remaining partial content in the buffer
    ///
    /// Call this when the stream ends to process any remaining data
    pub fn flush(&mut self) -> Option<StreamMessage> {
        let line = self.buffer.trim();
        if line.is_empty() {
            return None;
        }

        let result = self.parse_line(line).ok();
        self.buffer.clear();
        result
    }

    /// Clear the buffer without parsing
    pub fn clear(&mut self) {
        self.buffer.clear();
    }

    /// Check if the buffer has any pending data
    pub fn has_pending(&self) -> bool {
        !self.buffer.trim().is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_single_complete_message() {
        let mut parser = StreamJsonParser::new();
        let input = "{\"type\":\"message\",\"role\":\"assistant\",\"content\":\"hello\"}\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 1);
        match &messages[0] {
            StreamMessage::Assistant { role, .. } => {
                assert_eq!(role, "assistant");
            }
            _ => panic!("Expected Assistant message"),
        }
    }

    #[test]
    fn test_parse_multiple_messages_in_one_chunk() {
        let mut parser = StreamJsonParser::new();
        let input = "{\"type\":\"system\",\"session_id\":\"a\"}\n{\"type\":\"message\",\"role\":\"assistant\"}\n{\"type\":\"result\"}\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 3);
    }

    #[test]
    fn test_parse_empty_lines_ignored() {
        let mut parser = StreamJsonParser::new();
        let input = "\n\n{\"type\":\"system\"}\n\n\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 1);
    }

    #[test]
    fn test_partial_line_buffered() {
        let mut parser = StreamJsonParser::new();

        // First chunk: incomplete JSON
        let chunk1 = "{\"type\":\"mess";
        let messages1 = parser.parse_chunk(chunk1.as_bytes());
        assert_eq!(messages1.len(), 0);

        // Second chunk: completes the JSON
        let chunk2 = "age\",\"role\":\"assistant\"}\n";
        let messages2 = parser.parse_chunk(chunk2.as_bytes());
        assert_eq!(messages2.len(), 1);
    }

    #[test]
    fn test_message_split_across_three_chunks() {
        let mut parser = StreamJsonParser::new();

        parser.parse_chunk("{\"ty".as_bytes());
        parser.parse_chunk("pe\":\"me".as_bytes());
        let messages = parser.parse_chunk("ssage\"}".as_bytes());
        assert_eq!(messages.len(), 0); // No newline yet

        let messages = parser.parse_chunk("\n".as_bytes());
        assert_eq!(messages.len(), 1);
    }

    #[test]
    fn test_newline_in_middle_of_chunk() {
        let mut parser = StreamJsonParser::new();
        let input = "{\"type\":\"system\"}\n{\"type\":\"mess";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 1); // Only first complete

        let messages = parser.parse_chunk("age\"}\n".as_bytes());
        assert_eq!(messages.len(), 1); // Second now complete
    }

    #[test]
    fn test_malformed_json_skipped_gracefully() {
        let mut parser = StreamJsonParser::new();
        let input = "not valid json\n{\"type\":\"system\"}\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 1);
    }

    #[test]
    fn test_truncated_json_skipped() {
        let mut parser = StreamJsonParser::new();
        let input = "{\"type\":\n{\"type\":\"system\"}\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 1);
    }

    #[test]
    fn test_empty_object() {
        let mut parser = StreamJsonParser::new();
        let input = "{}\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 1);
    }

    #[test]
    fn test_tool_use_message() {
        let mut parser = StreamJsonParser::new();
        let input = "{\"type\":\"tool_use\",\"id\":\"123\",\"name\":\"Read\",\"input\":{\"file_path\":\"/test.txt\"}}\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 1);
        match &messages[0] {
            StreamMessage::ToolUse { id, name, .. } => {
                assert_eq!(id, "123");
                assert_eq!(name, "Read");
            }
            _ => panic!("Expected ToolUse message"),
        }
    }

    #[test]
    fn test_tool_result_message() {
        let mut parser = StreamJsonParser::new();
        let input = "{\"type\":\"tool_result\",\"tool_use_id\":\"123\",\"content\":\"file contents\"}\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 1);
        match &messages[0] {
            StreamMessage::ToolResult { tool_use_id, .. } => {
                assert_eq!(tool_use_id, "123");
            }
            _ => panic!("Expected ToolResult message"),
        }
    }

    #[test]
    fn test_result_message() {
        let mut parser = StreamJsonParser::new();
        let input = "{\"type\":\"result\",\"cost_usd\":0.05,\"duration_ms\":1234}\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 1);
        match &messages[0] {
            StreamMessage::Result { cost_usd, duration_ms, .. } => {
                assert_eq!(*cost_usd, Some(0.05));
                assert_eq!(*duration_ms, Some(1234));
            }
            _ => panic!("Expected Result message"),
        }
    }

    #[test]
    fn test_error_message() {
        let mut parser = StreamJsonParser::new();
        let input = "{\"type\":\"error\",\"error\":{\"message\":\"Rate limited\"}}\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 1);
        match &messages[0] {
            StreamMessage::Error { error, .. } => {
                assert_eq!(error.message, "Rate limited");
            }
            _ => panic!("Expected Error message"),
        }
    }

    #[test]
    fn test_unknown_type_uses_fallback() {
        let mut parser = StreamJsonParser::new();
        let input = "{\"type\":\"future_type\",\"data\":\"something\"}\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 1);
        assert!(matches!(messages[0], StreamMessage::Unknown));
    }

    #[test]
    fn test_flush_returns_partial_on_eof() {
        let mut parser = StreamJsonParser::new();
        parser.parse_chunk("{\"type\":\"system\"}".as_bytes());
        let flushed = parser.flush();
        assert!(flushed.is_some());
    }

    #[test]
    fn test_crlf_line_endings() {
        let mut parser = StreamJsonParser::new();
        let input = "{\"type\":\"system\"}\r\n{\"type\":\"message\"}\r\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 2);
    }

    #[test]
    fn test_mixed_line_endings() {
        let mut parser = StreamJsonParser::new();
        let input = "{\"type\":\"system\"}\n{\"type\":\"message\"}\r\n{\"type\":\"result\"}\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 3);
    }

    #[test]
    fn test_unicode_content() {
        let mut parser = StreamJsonParser::new();
        let input = "{\"type\":\"message\",\"content\":\"Hello World\"}\n";
        let messages = parser.parse_chunk(input.as_bytes());
        assert_eq!(messages.len(), 1);
    }

    #[test]
    fn test_has_pending() {
        let mut parser = StreamJsonParser::new();
        assert!(!parser.has_pending());
        parser.parse_chunk("{\"type\":\"partial".as_bytes());
        assert!(parser.has_pending());
    }

    #[test]
    fn test_clear() {
        let mut parser = StreamJsonParser::new();
        parser.parse_chunk("{\"type\":\"partial".as_bytes());
        assert!(parser.has_pending());
        parser.clear();
        assert!(!parser.has_pending());
    }
}
