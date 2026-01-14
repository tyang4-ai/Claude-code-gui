/**
 * StatusBar - Bottom status bar showing session info
 *
 * Displays:
 * - Current session info
 * - Pending edit count
 * - Connection status
 * - Live cost tracking
 */

import { useMemo } from "react";
import { useStore } from "../../core/store";
import { useShallow } from "zustand/react/shallow";
import { formatCost } from "../../modules/usage/calculator";

export function StatusBar() {
  // Use primitive selectors to avoid infinite re-render loops
  const activeSessionId = useStore((state) => state.activeSessionId);
  const sessionsMap = useStore(useShallow((state) => state.sessions));
  const yoloMode = useStore((state) => state.yoloMode);

  // Memoize derived values
  const activeSession = useMemo(() => {
    if (!activeSessionId) return null;
    return sessionsMap[activeSessionId] || null;
  }, [activeSessionId, sessionsMap]);

  const pendingEditCount = useMemo(() => {
    let count = 0;
    for (const session of Object.values(sessionsMap)) {
      count += session.pendingEdits.length;
    }
    return count;
  }, [sessionsMap]);

  // Context window indicator color based on usage percentage
  const contextInfo = useMemo(() => {
    if (!activeSession || !activeSession.contextTokensUsed || !activeSession.contextTokensTotal) {
      return null;
    }
    const used = activeSession.contextTokensUsed;
    const total = activeSession.contextTokensTotal;
    const percentage = (used / total) * 100;

    // Color based on percentage: green < 70%, yellow 70-85%, red > 85%
    let color: string;
    if (percentage < 70) {
      color = 'var(--color-success)'; // green
    } else if (percentage <= 85) {
      color = 'var(--color-warning)'; // yellow
    } else {
      color = 'var(--color-error)'; // red
    }

    // Format as "45K / 200K"
    const formatTokens = (n: number) => {
      if (n >= 1000) {
        return `${Math.round(n / 1000)}K`;
      }
      return n.toString();
    };

    return {
      used,
      total,
      percentage,
      color,
      displayText: `${formatTokens(used)} / ${formatTokens(total)}`
    };
  }, [activeSession]);

  return (
    <div style={{
      height: '24px',
      backgroundColor: 'var(--color-bg-surface)',
      borderTop: '1px solid var(--color-border-muted)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      fontSize: 'var(--text-xs)',
      color: 'var(--color-text-secondary)'
    }}>
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {activeSession && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Session:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{activeSession.id.slice(0, 8)}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Model:</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{activeSession.model}</span>
            </span>
          </>
        )}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Context Window Indicator */}
        {contextInfo && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Context:</span>
            <div style={{
              width: '60px',
              height: '6px',
              backgroundColor: 'var(--color-bg-base)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: `${Math.min(contextInfo.percentage, 100)}%`,
                height: '100%',
                backgroundColor: contextInfo.color,
                borderRadius: 'var(--radius-sm)',
                transition: 'width var(--transition-slow), background-color var(--transition-slow)'
              }} />
            </div>
            <span style={{ color: contextInfo.color, fontSize: 'var(--text-xs)', minWidth: '70px' }}>
              {contextInfo.displayText}
            </span>
          </span>
        )}

        {/* Live Cost Display */}
        {activeSession && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>Cost:</span>
            <span style={{ color: 'var(--color-accent)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }}>
              {formatCost(activeSession.total_cost_usd || 0)}
            </span>
          </span>
        )}

        {pendingEditCount > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-warning)' }}>
            <svg style={{ width: '12px', height: '12px' }} fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {pendingEditCount} pending edit{pendingEditCount !== 1 ? "s" : ""}
          </span>
        )}

        {yoloMode && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-accent)' }}>
            <svg style={{ width: '12px', height: '12px' }} fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            YOLO
          </span>
        )}

        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: activeSession ? 'var(--color-success)' : 'var(--color-text-muted)'
            }}
          />
          {activeSession ? "Connected" : "No session"}
        </span>
      </div>
    </div>
  );
}
