/**
 * Debug Panel to test if components are working
 */

import { useState } from 'react';
import { CommandPalette } from './layout/CommandPalette';
import { SessionBrowser } from './layout/SessionBrowser';

export function DebugPanel() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sessionBrowserOpen, setSessionBrowserOpen] = useState(false);

  return (
    <>
      {/* Debug buttons - positioned at top right */}
      <div style={{
        position: 'fixed',
        top: 10,
        right: 10,
        zIndex: 999,
        display: 'flex',
        gap: '8px',
        padding: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '8px',
        border: '2px solid #ff0000'
      }}>
        <button
          onClick={() => setCommandPaletteOpen(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Test Command Palette
        </button>
        <button
          onClick={() => setSessionBrowserOpen(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Test Session Browser
        </button>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Session Browser */}
      <SessionBrowser
        isOpen={sessionBrowserOpen}
        onClose={() => setSessionBrowserOpen(false)}
      />
    </>
  );
}