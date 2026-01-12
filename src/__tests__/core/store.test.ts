/**
 * Store unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, selectActiveSession, selectSessionList, selectSessionCount } from '../../core/store';

describe('Zustand Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useStore.setState({
      sessions: {},
      activeSessionId: null,
      sidebarOpen: true,
      theme: 'dark',
      yoloMode: false,
      defaultModel: 'sonnet',
      globalHotkey: 'CommandOrControl+Shift+Space',
    });
  });

  describe('createSession', () => {
    it('should create a new session', () => {
      const { createSession } = useStore.getState();

      createSession({
        id: 'test-session-1',
        working_dir: '/test/path',
        model: 'sonnet',
        status: 'idle',
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

      const state = useStore.getState();
      expect(state.sessions['test-session-1']).toBeDefined();
      expect(state.sessions['test-session-1'].working_dir).toBe('/test/path');
      expect(state.activeSessionId).toBe('test-session-1');
    });

    it('should initialize session with empty transcript and pendingEdits', () => {
      const { createSession } = useStore.getState();

      createSession({
        id: 'test-session-2',
        working_dir: '/test',
        model: 'sonnet',
        status: 'idle',
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

      const state = useStore.getState();
      expect(state.sessions['test-session-2'].transcript).toEqual([]);
      expect(state.sessions['test-session-2'].pendingEdits).toEqual([]);
    });
  });

  describe('closeSession', () => {
    it('should remove session from store', () => {
      const { createSession, closeSession } = useStore.getState();

      createSession({
        id: 'session-to-close',
        working_dir: '/test',
        model: 'sonnet',
        status: 'idle',
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

      closeSession('session-to-close');

      const state = useStore.getState();
      expect(state.sessions['session-to-close']).toBeUndefined();
    });

    it('should switch to another session if active closed', () => {
      const { createSession, closeSession, setActiveSession } = useStore.getState();

      createSession({
        id: 'session-1',
        working_dir: '/test1',
        model: 'sonnet',
        status: 'idle',
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

      createSession({
        id: 'session-2',
        working_dir: '/test2',
        model: 'sonnet',
        status: 'idle',
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

      setActiveSession('session-1');
      closeSession('session-1');

      const state = useStore.getState();
      expect(state.activeSessionId).toBe('session-2');
    });

    it('should set activeSessionId to null if last session closed', () => {
      const { createSession, closeSession } = useStore.getState();

      createSession({
        id: 'only-session',
        working_dir: '/test',
        model: 'sonnet',
        status: 'idle',
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

      closeSession('only-session');

      const state = useStore.getState();
      expect(state.activeSessionId).toBeNull();
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status', () => {
      const { createSession, updateSessionStatus } = useStore.getState();

      createSession({
        id: 'status-test',
        working_dir: '/test',
        model: 'sonnet',
        status: 'idle',
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

      updateSessionStatus('status-test', 'thinking');

      const state = useStore.getState();
      expect(state.sessions['status-test'].status).toBe('thinking');
    });
  });

  describe('appendToTranscript', () => {
    it('should append entry to transcript', () => {
      const { createSession, appendToTranscript } = useStore.getState();

      createSession({
        id: 'transcript-test',
        working_dir: '/test',
        model: 'sonnet',
        status: 'idle',
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

      appendToTranscript('transcript-test', {
        role: 'user',
        content: 'Hello Claude',
        timestamp: Date.now(),
      });

      const state = useStore.getState();
      expect(state.sessions['transcript-test'].transcript).toHaveLength(1);
      expect(state.sessions['transcript-test'].transcript[0].role).toBe('user');
    });
  });

  describe('UI actions', () => {
    it('should toggle sidebar', () => {
      const { toggleSidebar } = useStore.getState();

      expect(useStore.getState().sidebarOpen).toBe(true);

      toggleSidebar();
      expect(useStore.getState().sidebarOpen).toBe(false);

      toggleSidebar();
      expect(useStore.getState().sidebarOpen).toBe(true);
    });

    it('should set theme', () => {
      const { setTheme } = useStore.getState();

      setTheme('light');
      expect(useStore.getState().theme).toBe('light');

      setTheme('dark');
      expect(useStore.getState().theme).toBe('dark');
    });
  });

  describe('Settings actions', () => {
    it('should set YOLO mode', () => {
      const { setYoloMode } = useStore.getState();

      expect(useStore.getState().yoloMode).toBe(false);

      setYoloMode(true);
      expect(useStore.getState().yoloMode).toBe(true);
    });

    it('should set default model', () => {
      const { setDefaultModel } = useStore.getState();

      setDefaultModel('opus');
      expect(useStore.getState().defaultModel).toBe('opus');
    });
  });

  describe('Selectors', () => {
    it('selectActiveSession should return active session', () => {
      const { createSession } = useStore.getState();

      createSession({
        id: 'active-session',
        working_dir: '/test',
        model: 'sonnet',
        status: 'idle',
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

      const activeSession = selectActiveSession(useStore.getState());
      expect(activeSession).not.toBeNull();
      expect(activeSession?.id).toBe('active-session');
    });

    it('selectActiveSession should return null when no active session', () => {
      const activeSession = selectActiveSession(useStore.getState());
      expect(activeSession).toBeNull();
    });

    it('selectSessionList should return all sessions', () => {
      const { createSession } = useStore.getState();

      createSession({
        id: 's1',
        working_dir: '/a',
        model: 'sonnet',
        status: 'idle',
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

      createSession({
        id: 's2',
        working_dir: '/b',
        model: 'sonnet',
        status: 'idle',
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

      const sessions = selectSessionList(useStore.getState());
      expect(sessions).toHaveLength(2);
    });

    it('selectSessionCount should return correct count', () => {
      const { createSession } = useStore.getState();

      expect(selectSessionCount(useStore.getState())).toBe(0);

      createSession({
        id: 's1',
        working_dir: '/a',
        model: 'sonnet',
        status: 'idle',
        created_at: Date.now(),
        prompt_count: 0,
        total_cost_usd: 0,
      });

      expect(selectSessionCount(useStore.getState())).toBe(1);
    });
  });
});
