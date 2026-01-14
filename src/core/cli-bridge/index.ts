/**
 * CLI Bridge - Interface for communicating with Claude CLI
 *
 * This module provides a TypeScript interface for spawning and managing
 * Claude CLI processes through Tauri's IPC system.
 *
 * ARCHITECTURE: Spawn-per-prompt model
 * - `createSession()` creates a LOGICAL session (no process spawned)
 * - `sendPrompt()` spawns a NEW Claude CLI process with `-p "<prompt>"`
 * - Multi-turn uses `--resume <claude_session_id>` automatically
 * - Messages stream via "cli-message" Tauri events
 */

import { Subject, Observable, filter, map } from "rxjs";

// Dynamic imports to avoid crashes during module load
type UnlistenFn = () => void;
import type {
  SessionConfig,
  SessionInfo,
  StreamMessage,
  ToolUseMessage,
  ErrorMessage,
} from "../types";

// Event payload from Tauri backend
interface StreamEvent {
  sessionId: string;
  message: StreamMessage;
}

interface CLIError {
  sessionId: string;
  message: string;
  errorType?: string;
}

// Backend response types
interface CreateSessionResult {
  session_id: string;
}

// Singleton instance
let bridgeInstance: CLIBridge | null = null;

/**
 * CLI Bridge for managing Claude CLI sessions
 *
 * Uses the spawn-per-prompt model:
 * - Each prompt spawns a new Claude CLI process
 * - Sessions are logical containers that track the Claude session ID
 * - Multi-turn conversations use --resume automatically
 */
export class CLIBridge {
  private sessions: Map<string, SessionInfo> = new Map();
  private messageSubject = new Subject<StreamEvent>();
  private errorSubject = new Subject<CLIError>();
  private unlisten: UnlistenFn | null = null;
  private initialized = false;

  /**
   * Get the singleton instance
   */
  static getInstance(): CLIBridge {
    if (!bridgeInstance) {
      bridgeInstance = new CLIBridge();
    }
    return bridgeInstance;
  }

  constructor() {
    this.setupEventListeners().catch((error) => {
      console.warn("Failed to setup CLI event listeners:", error);
    });
  }

  /**
   * Set up Tauri event listeners
   */
  private async setupEventListeners(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      // Dynamically import Tauri event API
      const { listen } = await import("@tauri-apps/api/event");

      // Listen for stream messages from backend
      this.unlisten = await listen<StreamEvent>("cli-message", (event) => {
        this.messageSubject.next(event.payload);

        // Update local session cache with status changes
        const session = this.sessions.get(event.payload.sessionId);
        if (session) {
          // Update status based on message type
          if (event.payload.message.type === "result") {
            session.status = "idle";
          } else if (event.payload.message.type === "error") {
            session.status = "error";
            const errMsg = event.payload.message as { error?: { message?: string } };
            this.errorSubject.next({
              sessionId: event.payload.sessionId,
              message: errMsg.error?.message || "Unknown error",
            });
          }
        }
      });
    } catch (error) {
      console.warn("Failed to listen for CLI messages:", error);
    }
  }

  /**
   * Helper to dynamically import and call invoke
   */
  private async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<T>(cmd, args);
  }

  /**
   * Create a new Claude CLI session (logical, no process spawned yet)
   *
   * The actual Claude CLI process is spawned when sendPrompt() is called.
   * This follows the spawn-per-prompt model.
   */
  async createSession(config: SessionConfig): Promise<string> {
    const result = await this.invoke<CreateSessionResult>("spawn_session", {
      config: {
        working_dir: config.working_dir,
        model: config.model || "sonnet",
        allowed_tools: config.allowed_tools || [],
      },
    });

    const sessionInfo: SessionInfo = {
      id: result.session_id,
      claude_session_id: undefined, // Set after first prompt
      working_dir: config.working_dir,
      model: config.model || "sonnet",
      status: "idle",
      created_at: Date.now(),
      prompt_count: 0,
      total_cost_usd: 0,
    };

    this.sessions.set(result.session_id, sessionInfo);
    return result.session_id;
  }

  /**
   * @deprecated Use createSession() instead
   */
  async spawnInteractive(config: SessionConfig): Promise<string> {
    return this.createSession(config);
  }

  /**
   * Send a prompt to a session - spawns a NEW Claude CLI process
   *
   * This is the spawn-per-prompt model:
   * 1. Backend spawns: `claude -p "<prompt>" --output-format stream-json [--resume <id>]`
   * 2. Messages stream via "cli-message" Tauri events
   * 3. Process terminates when Claude finishes
   * 4. --resume is added automatically for multi-turn
   */
  async sendPrompt(sessionId: string, prompt: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update local status
    session.status = "thinking";

    await this.invoke("send_prompt", { sessionId, prompt });
  }

  /**
   * Send interrupt signal (kills the active Claude CLI process)
   */
  async sendInterrupt(sessionId: string): Promise<void> {
    await this.invoke("send_interrupt", { sessionId });

    // Update local status
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "idle";
    }
  }

  /**
   * Terminate a session and clean up
   */
  async terminateSession(sessionId: string): Promise<void> {
    await this.invoke("terminate_session", { sessionId });
    this.sessions.delete(sessionId);
  }

  /**
   * Get observable for all messages from a session
   */
  onMessage(sessionId: string): Observable<StreamMessage> {
    return this.messageSubject.asObservable().pipe(
      filter((event) => event.sessionId === sessionId),
      filter((event) => event.message !== undefined),
      map((event) => event.message)
    );
  }

  /**
   * Get observable for all messages (any session)
   */
  onAllMessages(): Observable<StreamEvent> {
    return this.messageSubject.asObservable();
  }

  /**
   * Get observable for tool use events from a session
   */
  onToolUse(sessionId: string): Observable<ToolUseMessage> {
    return this.messageSubject.asObservable().pipe(
      filter((event) => event.sessionId === sessionId),
      filter((event) => event.message.type === "tool_use"),
      map((event) => event.message as ToolUseMessage)
    );
  }

  /**
   * Get observable for errors from a session
   */
  onError(sessionId: string): Observable<CLIError> {
    return this.errorSubject.asObservable().pipe(
      filter((error) => error.sessionId === sessionId)
    );
  }

  /**
   * Check if a session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Refresh session list from backend
   */
  async refreshSessions(): Promise<void> {
    const sessions = await this.invoke<SessionInfo[]>("get_sessions");
    this.sessions.clear();
    for (const session of sessions) {
      this.sessions.set(session.id, session);
    }
  }

  /**
   * Check if a session is alive
   */
  async isAlive(sessionId: string): Promise<boolean> {
    return this.invoke<boolean>("is_session_alive", { sessionId });
  }

  /**
   * Get session count
   */
  async getSessionCount(): Promise<number> {
    return this.invoke<number>("get_session_count");
  }

  /**
   * Terminate all sessions
   */
  async terminateAll(): Promise<void> {
    await this.invoke("terminate_all_sessions");
    this.sessions.clear();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.unlisten) {
      this.unlisten();
    }
    this.messageSubject.complete();
    this.errorSubject.complete();
  }

  /**
   * Internal: Handle backend events (for testing)
   */
  _handleBackendEvent(sessionId: string, message: StreamMessage): void {
    this.messageSubject.next({ sessionId, message });

    // Replicate the same logic as the event listener
    const session = this.sessions.get(sessionId);
    if (session) {
      // Update status based on message type
      if (message.type === "result") {
        session.status = "idle";
      } else if (message.type === "error") {
        session.status = "error";
        const errMsg = message as ErrorMessage;
        this.errorSubject.next({
          sessionId,
          message: errMsg.error?.message || "Unknown error",
        });
      }
    }
  }
}

/**
 * Get the CLI Bridge singleton instance
 */
export function getCLIBridge(): CLIBridge {
  return CLIBridge.getInstance();
}
