/**
 * Toast Provider Component
 *
 * Context-based notification system with queue management.
 * Provides useToast hook for easy toast creation throughout the app.
 */

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { Toast, type ToastData, type ToastType } from "./Toast";

// Maximum number of visible toasts at once
const MAX_VISIBLE_TOASTS = 5;

// Default duration in milliseconds
const DEFAULT_DURATION = 5000;

// ============================================================================
// Types
// ============================================================================

export interface ToastOptions {
  title?: string;
  duration?: number;
  dismissible?: boolean;
}

export interface ToastContextValue {
  /** Show a toast notification */
  toast: (type: ToastType, message: string, options?: ToastOptions) => string;
  /** Show a success toast */
  success: (message: string, options?: ToastOptions) => string;
  /** Show an error toast */
  error: (message: string, options?: ToastOptions) => string;
  /** Show a warning toast */
  warning: (message: string, options?: ToastOptions) => string;
  /** Show an info toast */
  info: (message: string, options?: ToastOptions) => string;
  /** Dismiss a specific toast by ID */
  dismiss: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
}

// ============================================================================
// Context
// ============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access toast notifications.
 *
 * @example
 * ```tsx
 * const { success, error } = useToast();
 *
 * // Show success toast
 * success("File saved successfully");
 *
 * // Show error toast with title
 * error("Could not connect to server", { title: "Connection Error" });
 *
 * // Show warning with custom duration (10 seconds)
 * warning("Your session is about to expire", { duration: 10000 });
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

export interface ToastProviderProps {
  children: ReactNode;
  /** Position of toasts on screen */
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** Default duration for toasts in milliseconds */
  defaultDuration?: number;
  /** Maximum number of visible toasts */
  maxVisible?: number;
}

export function ToastProvider({
  children,
  position = "top-right",
  defaultDuration = DEFAULT_DURATION,
  maxVisible = MAX_VISIBLE_TOASTS,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idCounterRef = useRef(0);

  // Generate unique ID for each toast
  const generateId = useCallback(() => {
    idCounterRef.current += 1;
    return `toast-${Date.now()}-${idCounterRef.current}`;
  }, []);

  // Add a new toast to the queue
  const addToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions): string => {
      const id = generateId();
      const newToast: ToastData = {
        id,
        type,
        message,
        title: options?.title,
        duration: options?.duration ?? defaultDuration,
        dismissible: options?.dismissible ?? true,
      };

      setToasts((prev) => {
        // If we've reached max visible, remove the oldest
        if (prev.length >= maxVisible) {
          return [...prev.slice(1), newToast];
        }
        return [...prev, newToast];
      });

      return id;
    },
    [generateId, defaultDuration, maxVisible]
  );

  // Dismiss a specific toast
  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Dismiss all toasts
  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods for each toast type
  const toast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions) =>
      addToast(type, message, options),
    [addToast]
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast("success", message, options),
    [addToast]
  );

  const error = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast("error", message, options),
    [addToast]
  );

  const warning = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast("warning", message, options),
    [addToast]
  );

  const info = useCallback(
    (message: string, options?: ToastOptions) =>
      addToast("info", message, options),
    [addToast]
  );

  // Context value
  const contextValue: ToastContextValue = {
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };

  // Calculate container position styles
  const positionStyles = getPositionStyles(position);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast Container */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        style={{
          position: "fixed",
          ...positionStyles,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          pointerEvents: "none",
          padding: "16px",
        }}
      >
        {/* Render visible toasts */}
        <div style={{ position: "relative", minHeight: toasts.length * 80 }}>
          {toasts.map((toast, index) => (
            <Toast
              key={toast.id}
              toast={toast}
              onDismiss={dismiss}
              position={index}
            />
          ))}
        </div>
      </div>

      {/* CSS for progress bar animation */}
      <style>{`
        @keyframes toastProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getPositionStyles(
  position: "top-right" | "top-left" | "bottom-right" | "bottom-left"
): React.CSSProperties {
  switch (position) {
    case "top-right":
      return { top: 0, right: 0 };
    case "top-left":
      return { top: 0, left: 0 };
    case "bottom-right":
      return { bottom: 0, right: 0 };
    case "bottom-left":
      return { bottom: 0, left: 0 };
    default:
      return { top: 0, right: 0 };
  }
}
