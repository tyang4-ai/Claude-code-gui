/**
 * Claude GUI Companion - Main App Component
 */

import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ToastProvider } from "./components/notifications";
import { initializeSessionPersistence } from "./core/store";

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize session persistence on app startup with timeout
    const initPromise = initializeSessionPersistence()
      .then(() => {
        console.log("Session persistence initialized successfully");
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error("Failed to initialize session persistence:", error);
        setInitError(String(error));
        setIsInitialized(true); // Continue anyway
      });

    // Timeout after 3 seconds - show app anyway
    const timeout = setTimeout(() => {
      console.warn("Initialization timeout - showing app anyway");
      setIsInitialized(true);
    }, 3000);

    initPromise.finally(() => clearTimeout(timeout));

    return () => clearTimeout(timeout);
  }, []);

  if (!isInitialized) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a2e',
        color: '#e8e8e8'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid #00d4ff',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ color: '#a0a0a0', fontSize: '14px' }}>Loading sessions...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (initError) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a2e',
        color: '#e8e8e8',
        flexDirection: 'column',
        gap: '16px',
        padding: '32px',
        textAlign: 'center'
      }}>
        <span style={{ color: '#ef4444', fontSize: '18px' }}>Initialization Error</span>
        <span style={{ color: '#a0a0a0', fontSize: '14px' }}>{initError}</span>
        <AppShell />
      </div>
    );
  }

  return (
    <ToastProvider position="top-right">
      <AppShell />
    </ToastProvider>
  );
}

export default App;
