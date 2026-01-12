/**
 * Claude GUI Companion - Main App Component
 */

import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { initializeSessionPersistence } from "./core/store";

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize session persistence on app startup
    initializeSessionPersistence()
      .then(() => {
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error("Failed to initialize session persistence:", error);
        setIsInitialized(true); // Continue anyway
      });
  }, []);

  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full" />
          <span className="text-secondary text-sm">Loading sessions...</span>
        </div>
      </div>
    );
  }

  return <AppShell />;
}

export default App;
