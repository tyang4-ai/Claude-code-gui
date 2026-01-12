//! Backend services for Claude GUI Companion
//!
//! This module contains the core services for managing Claude CLI processes
//! and parsing their output.

pub mod parser;
pub mod process;

pub use parser::{StreamJsonParser, StreamMessage, ParseError};
pub use process::{ProcessManager, ProcessError, SessionConfig, SessionInfo, SessionStatus};
