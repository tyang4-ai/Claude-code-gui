/**
 * Edit Arbiter unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { EditArbiter } from '../../core/edit-arbiter';
import type { PendingEdit } from '../../core/types';

vi.mock('@tauri-apps/api/core');

function createMockEdit(overrides: Partial<PendingEdit> = {}): PendingEdit {
  return {
    id: 'edit-' + Math.random().toString(36).substr(2, 9),
    sessionId: 'session-1',
    toolName: 'Edit',
    filePath: '/test/file.ts',
    originalContent: 'const x = 1;',
    proposedContent: 'const x = 2;',
    diff: '- const x = 1;\n+ const x = 2;',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('EditArbiter', () => {
  let arbiter: EditArbiter;

  beforeEach(() => {
    arbiter = EditArbiter.getInstance();
    // Clear internal state
    arbiter._clearAll();
    vi.clearAllMocks();
  });

  // === QUEUE MANAGEMENT ===

  describe('queueEdit', () => {
    it('should add edit to session queue', () => {
      const edit = createMockEdit({ id: 'edit-1' });
      arbiter.queueEdit('session-1', edit);

      expect(arbiter.getEditQueue('session-1')).toContain(edit);
    });

    it('should maintain order in queue', () => {
      arbiter.queueEdit('s1', createMockEdit({ id: '1' }));
      arbiter.queueEdit('s1', createMockEdit({ id: '2' }));
      arbiter.queueEdit('s1', createMockEdit({ id: '3' }));

      const queue = arbiter.getEditQueue('s1');
      expect(queue.map(e => e.id)).toEqual(['1', '2', '3']);
    });

    it('should isolate queues by session', () => {
      arbiter.queueEdit('s1', createMockEdit({ id: 'a', sessionId: 's1' }));
      arbiter.queueEdit('s2', createMockEdit({ id: 'b', sessionId: 's2' }));

      expect(arbiter.getEditQueue('s1')).toHaveLength(1);
      expect(arbiter.getEditQueue('s2')).toHaveLength(1);
    });
  });

  // === ACCEPT/REJECT ===

  describe('acceptEdit', () => {
    it('should invoke backend to apply edit', async () => {
      const edit = createMockEdit({ id: 'accept-test' });
      arbiter.queueEdit('s1', edit);

      vi.mocked(invoke).mockResolvedValue({ type: 'success' });
      const result = await arbiter.acceptEdit(edit.id);

      expect(invoke).toHaveBeenCalledWith('apply_edit', {
        path: edit.filePath,
        original_content: edit.originalContent,
        proposed_content: edit.proposedContent,
      });
      expect(result.type).toBe('success');
    });

    it('should remove edit from queue after accept', async () => {
      const edit = createMockEdit();
      arbiter.queueEdit('s1', edit);

      vi.mocked(invoke).mockResolvedValue({ type: 'success' });
      await arbiter.acceptEdit(edit.id);

      expect(arbiter.getEditQueue('s1')).not.toContainEqual(
        expect.objectContaining({ id: edit.id })
      );
    });

    it('should return conflict info when file modified', async () => {
      const edit = createMockEdit();
      arbiter.queueEdit('s1', edit);

      vi.mocked(invoke).mockResolvedValue({
        type: 'conflict',
        current_content: 'modified',
        base_content: 'original',
        proposed_content: 'proposed',
      });

      const result = await arbiter.acceptEdit(edit.id);
      expect(result.type).toBe('conflict');
    });

    it('should throw if edit not found', async () => {
      await expect(arbiter.acceptEdit('nonexistent'))
        .rejects.toThrow('Edit not found');
    });
  });

  describe('rejectEdit', () => {
    it('should remove edit from queue', async () => {
      const edit = createMockEdit();
      arbiter.queueEdit('s1', edit);

      await arbiter.rejectEdit(edit.id);

      expect(arbiter.getEditQueue('s1')).not.toContainEqual(
        expect.objectContaining({ id: edit.id })
      );
    });

    it('should throw if edit not found', async () => {
      await expect(arbiter.rejectEdit('nonexistent'))
        .rejects.toThrow('Edit not found');
    });
  });

  describe('acceptAll', () => {
    it('should accept all edits in session queue', async () => {
      arbiter.queueEdit('s1', createMockEdit({ id: '1', sessionId: 's1' }));
      arbiter.queueEdit('s1', createMockEdit({ id: '2', sessionId: 's1' }));
      arbiter.queueEdit('s1', createMockEdit({ id: '3', sessionId: 's1' }));

      vi.mocked(invoke).mockResolvedValue({ type: 'success' });
      const results = await arbiter.acceptAll('s1');

      expect(results).toHaveLength(3);
      expect(arbiter.getEditQueue('s1')).toHaveLength(0);
    });

    it('should stop on first conflict', async () => {
      arbiter.queueEdit('s1', createMockEdit({ id: '1', sessionId: 's1' }));
      arbiter.queueEdit('s1', createMockEdit({ id: '2', sessionId: 's1' }));

      vi.mocked(invoke)
        .mockResolvedValueOnce({ type: 'success' })
        .mockResolvedValueOnce({ type: 'conflict', current_content: 'x' });

      const results = await arbiter.acceptAll('s1');

      expect(results).toHaveLength(2);
      expect(results[1].type).toBe('conflict');
      // Second edit should still be in queue due to conflict
      expect(arbiter.getEditQueue('s1')).toHaveLength(1);
    });
  });

  // === YOLO MODE ===

  describe('YOLO Mode', () => {
    it('should default to disabled', () => {
      expect(arbiter.isYoloMode()).toBe(false);
    });

    it('should toggle YOLO mode', () => {
      arbiter.setYoloMode(true);
      expect(arbiter.isYoloMode()).toBe(true);

      arbiter.setYoloMode(false);
      expect(arbiter.isYoloMode()).toBe(false);
    });

    it('should auto-accept when YOLO enabled', async () => {
      arbiter.setYoloMode(true);
      vi.mocked(invoke).mockResolvedValue({ type: 'success' });

      const edit = createMockEdit();
      arbiter.queueEdit('s1', edit);

      // In YOLO mode, queueEdit should trigger auto-accept
      // Wait for the auto-accept to process
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(invoke).toHaveBeenCalledWith('apply_edit', expect.anything());
      expect(arbiter.getEditQueue('s1')).toHaveLength(0);
    });

    it('should log auto-accepted edits for audit', async () => {
      arbiter.setYoloMode(true);
      vi.mocked(invoke).mockResolvedValue({ type: 'success' });

      arbiter.queueEdit('s1', createMockEdit({ id: '1' }));
      arbiter.queueEdit('s1', createMockEdit({ id: '2' }));

      await new Promise(resolve => setTimeout(resolve, 200));

      const auditLog = arbiter.getAuditLog();
      expect(auditLog.length).toBeGreaterThanOrEqual(2);
      expect(auditLog.every(entry => entry.autoAccepted)).toBe(true);
    });
  });

  // === CONFLICT DETECTION ===

  describe('checkConflicts', () => {
    it('should return null when file unchanged', async () => {
      const edit = createMockEdit({ originalContent: 'hello' });

      vi.mocked(invoke).mockResolvedValue({ modified: false });
      const conflict = await arbiter.checkConflicts(edit);

      expect(conflict).toBeNull();
    });

    it('should return conflict info when file changed', async () => {
      const edit = createMockEdit({ originalContent: 'original' });

      vi.mocked(invoke).mockResolvedValue({
        modified: true,
        current_content: 'modified externally'
      });

      const conflict = await arbiter.checkConflicts(edit);

      expect(conflict).not.toBeNull();
      expect(conflict?.type).toBe('external-modification');
    });
  });

  // === PENDING EDIT COUNT ===

  describe('getPendingEditCount', () => {
    it('should return correct count across sessions', () => {
      arbiter.queueEdit('s1', createMockEdit({ sessionId: 's1' }));
      arbiter.queueEdit('s1', createMockEdit({ sessionId: 's1' }));
      arbiter.queueEdit('s2', createMockEdit({ sessionId: 's2' }));

      expect(arbiter.getPendingEditCount()).toBe(3);
    });
  });
});
