/**
 * CLI Bridge unit tests
 *
 * Tests the spawn-per-prompt model:
 * - createSession() creates a LOGICAL session (no process)
 * - sendPrompt() spawns a NEW Claude CLI process each time
 * - Multi-turn uses --resume automatically
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { CLIBridge } from '../../core/cli-bridge';
import { firstValueFrom, take } from 'rxjs';
import type { StreamMessage, ToolUseMessage } from '../../core/types';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/api/event');

describe('CLIBridge', () => {
  let bridge: CLIBridge;

  beforeEach(() => {
    // Create new instance to ensure clean state
    bridge = new CLIBridge();
    vi.clearAllMocks();
  });

  // === SESSION CREATION TESTS ===

  describe('createSession', () => {
    it('should return session ID on success', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'abc-123' });

      const id = await bridge.createSession({ working_dir: '/test' });

      expect(id).toBe('abc-123');
      expect(invoke).toHaveBeenCalledWith('spawn_session', {
        config: {
          working_dir: '/test',
          model: 'sonnet',
          allowed_tools: [],
        }
      });
    });

    it('should use provided model', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'abc-123' });

      await bridge.createSession({ working_dir: '/test', model: 'opus' });

      expect(invoke).toHaveBeenCalledWith('spawn_session', {
        config: {
          working_dir: '/test',
          model: 'opus',
          allowed_tools: [],
        }
      });
    });

    it('should use provided allowed_tools', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'abc-123' });

      await bridge.createSession({
        working_dir: '/test',
        allowed_tools: ['Read', 'Edit'],
      });

      expect(invoke).toHaveBeenCalledWith('spawn_session', {
        config: {
          working_dir: '/test',
          model: 'sonnet',
          allowed_tools: ['Read', 'Edit'],
        }
      });
    });

    it('should throw on spawn failure', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Invalid working directory'));

      await expect(bridge.createSession({ working_dir: '/nonexistent' }))
        .rejects.toThrow('Invalid working directory');
    });

    it('should register session in internal map', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'abc-123' });

      await bridge.createSession({ working_dir: '/test' });

      expect(bridge.hasSession('abc-123')).toBe(true);
    });

    it('should initialize session with correct defaults', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'abc-123' });

      await bridge.createSession({ working_dir: '/test' });

      const session = bridge.getSession('abc-123');
      expect(session).toBeDefined();
      expect(session?.status).toBe('idle');
      expect(session?.prompt_count).toBe(0);
      expect(session?.total_cost_usd).toBe(0);
      expect(session?.claude_session_id).toBeUndefined();
    });
  });

  // === DEPRECATED spawnInteractive ===

  describe('spawnInteractive (deprecated)', () => {
    it('should delegate to createSession', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'abc-123' });

      const id = await bridge.spawnInteractive({ working_dir: '/test' });

      expect(id).toBe('abc-123');
    });
  });

  // === MESSAGE HANDLING ===

  describe('onMessage', () => {
    it('should emit messages as observable', async () => {
      const observable = bridge.onMessage('session-1').pipe(take(1));

      // Emit message asynchronously
      setTimeout(() => {
        bridge._handleBackendEvent('session-1', {
          type: 'message',
          role: 'assistant',
          content: [],
        });
      }, 10);

      const msg = await firstValueFrom(observable);
      expect(msg.type).toBe('message');
    });

    it('should filter messages by session ID', () => {
      const messages: StreamMessage[] = [];
      bridge.onMessage('session-1').subscribe(m => messages.push(m));

      bridge._handleBackendEvent('session-2', {
        type: 'message',
        role: 'assistant',
        content: [],
      });
      expect(messages).toHaveLength(0);

      bridge._handleBackendEvent('session-1', {
        type: 'message',
        role: 'assistant',
        content: [],
      });
      expect(messages).toHaveLength(1);
    });
  });

  describe('onToolUse', () => {
    it('should emit only tool_use events', () => {
      const tools: ToolUseMessage[] = [];
      bridge.onToolUse('s1').subscribe(t => tools.push(t));

      bridge._handleBackendEvent('s1', {
        type: 'message',
        role: 'assistant',
        content: [],
      });
      bridge._handleBackendEvent('s1', {
        type: 'tool_use',
        id: '1',
        name: 'Read',
        input: { file_path: '/test.txt' },
      });

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('Read');
    });
  });

  // === INPUT ===

  describe('sendPrompt', () => {
    it('should invoke backend with prompt', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      vi.mocked(invoke).mockResolvedValue(undefined);
      await bridge.sendPrompt('session-1', 'Hello Claude');

      expect(invoke).toHaveBeenCalledWith('send_prompt', {
        sessionId: 'session-1',
        prompt: 'Hello Claude'
      });
    });

    it('should throw if session does not exist', async () => {
      await expect(bridge.sendPrompt('fake-id', 'Hi'))
        .rejects.toThrow('Session not found');
    });

    it('should update session status to thinking', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      vi.mocked(invoke).mockResolvedValue(undefined);
      await bridge.sendPrompt('session-1', 'Hello');

      const session = bridge.getSession('session-1');
      expect(session?.status).toBe('thinking');
    });
  });

  describe('sendInterrupt', () => {
    it('should send interrupt signal', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      vi.mocked(invoke).mockResolvedValue(undefined);
      await bridge.sendInterrupt('session-1');

      expect(invoke).toHaveBeenCalledWith('send_interrupt', { sessionId: 'session-1' });
    });

    it('should update session status to idle', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      // First set to thinking
      vi.mocked(invoke).mockResolvedValue(undefined);
      await bridge.sendPrompt('session-1', 'Hello');

      // Then interrupt
      await bridge.sendInterrupt('session-1');

      const session = bridge.getSession('session-1');
      expect(session?.status).toBe('idle');
    });
  });

  describe('terminateSession', () => {
    it('should terminate session and clean up', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      expect(bridge.hasSession('session-1')).toBe(true);

      vi.mocked(invoke).mockResolvedValue(undefined);
      await bridge.terminateSession('session-1');

      expect(bridge.hasSession('session-1')).toBe(false);
    });
  });

  // === UTILITY METHODS ===

  describe('getActiveSessions', () => {
    it('should return all sessions', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ session_id: 'session-1' })
        .mockResolvedValueOnce({ session_id: 'session-2' });

      await bridge.createSession({ working_dir: '/test1' });
      await bridge.createSession({ working_dir: '/test2' });

      const sessions = bridge.getActiveSessions();
      expect(sessions).toHaveLength(2);
    });
  });
});
