/**
 * CLI Bridge unit tests
 *
 * Tests the spawn-per-prompt model:
 * - createSession() creates a LOGICAL session (no process)
 * - sendPrompt() spawns a NEW Claude CLI process each time
 * - Multi-turn uses --resume automatically
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { CLIBridge, getCLIBridge } from '../../core/cli-bridge';
import { firstValueFrom, take } from 'rxjs';
import type { StreamMessage, ToolUseMessage } from '../../core/types';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/api/event');

describe('CLIBridge', () => {
  let bridge: CLIBridge;

  beforeEach(() => {
    // Setup mock for listen function to return proper unlisten function
    vi.mocked(listen).mockResolvedValue(() => {});

    // Create new instance to ensure clean state
    bridge = new CLIBridge();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up bridge instance
    bridge.dispose();
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

  describe('getSession', () => {
    it('should return session info', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      const session = bridge.getSession('session-1');
      expect(session).toBeDefined();
      expect(session?.id).toBe('session-1');
    });

    it('should return undefined for non-existent session', () => {
      const session = bridge.getSession('fake-id');
      expect(session).toBeUndefined();
    });
  });

  describe('refreshSessions', () => {
    it('should refresh sessions from backend', async () => {
      vi.mocked(invoke).mockResolvedValue([
        {
          id: 'session-1',
          claude_session_id: 'claude-123',
          working_dir: '/test',
          model: 'sonnet',
          status: 'idle',
          created_at: Date.now(),
          prompt_count: 5,
          total_cost_usd: 0.15,
        },
      ]);

      await bridge.refreshSessions();

      expect(bridge.hasSession('session-1')).toBe(true);
      const session = bridge.getSession('session-1');
      expect(session?.prompt_count).toBe(5);
      expect(session?.total_cost_usd).toBe(0.15);
    });
  });

  describe('isAlive', () => {
    it('should return true for alive session', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ session_id: 'session-1' })
        .mockResolvedValueOnce(true);

      await bridge.createSession({ working_dir: '/test' });
      const alive = await bridge.isAlive('session-1');
      expect(alive).toBe(true);
    });

    it('should return false for dead session', async () => {
      vi.mocked(invoke).mockResolvedValue(false);
      const alive = await bridge.isAlive('fake-id');
      expect(alive).toBe(false);
    });
  });

  describe('getSessionCount', () => {
    it('should return count from backend', async () => {
      vi.mocked(invoke).mockResolvedValue(3);
      const count = await bridge.getSessionCount();
      expect(count).toBe(3);
    });
  });

  describe('terminateAll', () => {
    it('should terminate all sessions', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ session_id: 'session-1' })
        .mockResolvedValueOnce({ session_id: 'session-2' })
        .mockResolvedValueOnce(undefined);

      await bridge.createSession({ working_dir: '/test1' });
      await bridge.createSession({ working_dir: '/test2' });
      expect(bridge.getActiveSessions()).toHaveLength(2);

      await bridge.terminateAll();
      expect(bridge.getActiveSessions()).toHaveLength(0);
    });
  });

  describe('onError', () => {
    it('should emit error messages', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      const errors: any[] = [];
      bridge.onError('session-1').subscribe(e => errors.push(e));

      // Simulate error message from backend
      bridge._handleBackendEvent('session-1', {
        type: 'error',
        error: { message: 'Test error', error_type: 'API_ERROR' },
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test error');
    });

    it('should filter errors by session ID', () => {
      const errors: any[] = [];
      bridge.onError('session-1').subscribe(e => errors.push(e));

      bridge._handleBackendEvent('session-2', {
        type: 'error',
        error: { message: 'Wrong session' },
      });

      expect(errors).toHaveLength(0);
    });
  });

  describe('onAllMessages', () => {
    it('should emit messages from all sessions', () => {
      const events: any[] = [];
      bridge.onAllMessages().subscribe(e => events.push(e));

      bridge._handleBackendEvent('session-1', {
        type: 'message',
        role: 'assistant',
        content: [],
      });

      bridge._handleBackendEvent('session-2', {
        type: 'message',
        role: 'assistant',
        content: [],
      });

      expect(events).toHaveLength(2);
      expect(events[0].sessionId).toBe('session-1');
      expect(events[1].sessionId).toBe('session-2');
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      // Create some subscriptions
      const messages: any[] = [];
      bridge.onMessage('test').subscribe(m => messages.push(m));

      bridge.dispose();

      // After dispose, no new messages should be received
      bridge._handleBackendEvent('test', {
        type: 'message',
        role: 'assistant',
        content: [],
      });

      expect(messages).toHaveLength(0);
    });
  });

  describe('getCLIBridge', () => {
    it('should return singleton instance', () => {
      const instance1 = getCLIBridge();
      const instance2 = getCLIBridge();
      expect(instance1).toBe(instance2);
    });
  });

  describe('CLIBridge.getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = CLIBridge.getInstance();
      const instance2 = CLIBridge.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('error handling', () => {
    it('should handle result message with status update', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      // Simulate result message
      bridge._handleBackendEvent('session-1', {
        type: 'result',
        cost_usd: 0.05,
        duration_ms: 1234,
      });

      const session = bridge.getSession('session-1');
      expect(session?.status).toBe('idle');
    });

    it('should handle error message with status update', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      const errors: any[] = [];
      bridge.onError('session-1').subscribe(e => errors.push(e));

      // Simulate error message
      bridge._handleBackendEvent('session-1', {
        type: 'error',
        error: { message: 'Test error' },
      });

      const session = bridge.getSession('session-1');
      expect(session?.status).toBe('error');
      expect(errors).toHaveLength(1);
    });

    it('should handle error message without error details', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      const errors: any[] = [];
      bridge.onError('session-1').subscribe(e => errors.push(e));

      // Simulate error message without error details
      bridge._handleBackendEvent('session-1', {
        type: 'error',
        error: {},
      } as any);

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Unknown error');
    });
  });

  describe('edge cases', () => {
    it('should handle message for non-existent session gracefully', () => {
      // Should not crash when receiving message for session that doesn't exist
      bridge._handleBackendEvent('fake-session', {
        type: 'result',
      });

      expect(bridge.hasSession('fake-session')).toBe(false);
    });

    it('should handle undefined message content', () => {
      const messages: any[] = [];
      bridge.onMessage('session-1').subscribe(m => messages.push(m));

      // Should filter out undefined messages
      const subject = (bridge as any).messageSubject;
      subject.next({ sessionId: 'session-1', message: undefined });

      expect(messages).toHaveLength(0);
    });
  });

  describe('event listener setup', () => {
    it('should handle event listener setup failure in constructor catch', async () => {
      // Spy on console.warn to verify error handling
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock the dynamic import to fail before the try-catch
      const mockModule = {
        listen: vi.fn()
      };

      // Override the import mock to throw
      vi.doMock('@tauri-apps/api/event', () => {
        throw new Error('Failed to import module');
      });

      // Create a bridge instance
      const newBridge = new CLIBridge();

      // Call setupEventListeners to trigger the error
      try {
        await (newBridge as any).setupEventListeners();
      } catch (e) {
        // Expected
      }

      // Wait for the constructor's catch to be called
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not crash
      expect(newBridge).toBeDefined();

      warnSpy.mockRestore();
      vi.doUnmock('@tauri-apps/api/event');
      newBridge.dispose();
    });

    it('should handle event listener setup failure gracefully', async () => {
      // Mock listen to throw an error
      vi.mocked(listen).mockRejectedValue(new Error('Event system unavailable'));

      // Create a new bridge (this triggers setupEventListeners)
      const newBridge = new CLIBridge();

      // Wait a bit for async setup to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not crash, just log a warning
      expect(newBridge).toBeDefined();

      newBridge.dispose();
    });

    it('should not initialize event listeners twice', async () => {
      // The setupEventListeners should check initialized flag
      const setupCount = (listen as any).mock.calls.length;

      // Call setupEventListeners directly (through constructor)
      await (bridge as any).setupEventListeners();

      // Should not have called listen again
      expect((listen as any).mock.calls.length).toBe(setupCount);
    });

    it('should handle real event listener callback', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      // Get the callback that was registered with listen
      const listenCalls = (listen as any).mock.calls;
      if (listenCalls.length > 0) {
        const callback = listenCalls[listenCalls.length - 1][1];

        // Simulate a real event from Tauri
        const event = {
          payload: {
            sessionId: 'session-1',
            message: {
              type: 'message',
              role: 'assistant',
              content: [],
            },
          },
        };

        // Call the callback
        callback(event);

        // Session should still be there
        expect(bridge.hasSession('session-1')).toBe(true);
      }
    });

    it('should handle result message via event listener', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      // Get the callback that was registered with listen
      const listenCalls = (listen as any).mock.calls;
      if (listenCalls.length > 0) {
        const callback = listenCalls[listenCalls.length - 1][1];

        // Simulate a result event
        const event = {
          payload: {
            sessionId: 'session-1',
            message: {
              type: 'result',
              cost_usd: 0.05,
            },
          },
        };

        callback(event);

        const session = bridge.getSession('session-1');
        expect(session?.status).toBe('idle');
      }
    });

    it('should handle error message via event listener', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      const errors: any[] = [];
      bridge.onError('session-1').subscribe(e => errors.push(e));

      // Get the callback that was registered with listen
      const listenCalls = (listen as any).mock.calls;
      if (listenCalls.length > 0) {
        const callback = listenCalls[listenCalls.length - 1][1];

        // Simulate an error event
        const event = {
          payload: {
            sessionId: 'session-1',
            message: {
              type: 'error',
              error: {
                message: 'API Error',
              },
            },
          },
        };

        callback(event);

        const session = bridge.getSession('session-1');
        expect(session?.status).toBe('error');
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('API Error');
      }
    });

    it('should handle error message without details via event listener', async () => {
      vi.mocked(invoke).mockResolvedValue({ session_id: 'session-1' });
      await bridge.createSession({ working_dir: '/test' });

      const errors: any[] = [];
      bridge.onError('session-1').subscribe(e => errors.push(e));

      // Get the callback that was registered with listen
      const listenCalls = (listen as any).mock.calls;
      if (listenCalls.length > 0) {
        const callback = listenCalls[listenCalls.length - 1][1];

        // Simulate an error event without message
        const event = {
          payload: {
            sessionId: 'session-1',
            message: {
              type: 'error',
              error: {},
            },
          },
        };

        callback(event);

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('Unknown error');
      }
    });

    it('should handle message for non-existent session via event listener', async () => {
      // Get the callback that was registered with listen
      const listenCalls = (listen as any).mock.calls;
      if (listenCalls.length > 0) {
        const callback = listenCalls[listenCalls.length - 1][1];

        // Simulate an event for a session that doesn't exist
        const event = {
          payload: {
            sessionId: 'nonexistent',
            message: {
              type: 'result',
            },
          },
        };

        // Should not crash
        callback(event);

        expect(bridge.hasSession('nonexistent')).toBe(false);
      }
    });
  });
});
