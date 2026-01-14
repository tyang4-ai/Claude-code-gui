/**
 * Toast Component
 *
 * Individual toast notification with icon, message, and close button.
 * Supports success, error, warning, and info types with matching styling.
 */

import { useEffect, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
  dismissible?: boolean;
}

export interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
  position: number;
}

// Icon components for each toast type
const icons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M7 7L13 13M13 7L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2L19 18H1L10 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 8V12M10 15V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M10 9V14M10 6V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

// Colors for each toast type matching the dark theme
const typeStyles: Record<ToastType, { bg: string; border: string; icon: string; accent: string }> = {
  success: {
    bg: "#1a2e26",
    border: "#10b981",
    icon: "#10b981",
    accent: "#10b981",
  },
  error: {
    bg: "#2e1a1a",
    border: "#ef4444",
    icon: "#ef4444",
    accent: "#ef4444",
  },
  warning: {
    bg: "#2e2a1a",
    border: "#f59e0b",
    icon: "#f59e0b",
    accent: "#f59e0b",
  },
  info: {
    bg: "#1a2e3e",
    border: "#00d4ff",
    icon: "#00d4ff",
    accent: "#00d4ff",
  },
};

export function Toast({ toast, onDismiss, position }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const { id, type, message, title, duration = 5000, dismissible = true } = toast;
  const styles = typeStyles[type];

  // Trigger enter animation
  useEffect(() => {
    // Small delay to ensure DOM is ready for animation
    const enterTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    return () => clearTimeout(enterTimer);
  }, []);

  // Handle dismiss with exit animation
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    // Wait for exit animation to complete
    setTimeout(() => {
      onDismiss(id);
    }, 200);
  }, [id, onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, handleDismiss]);

  // Calculate vertical position (stacking)
  const translateY = position * 80; // 80px per toast (height + gap)

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "absolute",
        top: `${translateY}px`,
        right: 0,
        width: "360px",
        maxWidth: "calc(100vw - 32px)",
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: "8px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 16px",
        transform: isVisible && !isExiting
          ? "translateX(0)"
          : "translateX(calc(100% + 24px))",
        opacity: isVisible && !isExiting ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease",
        pointerEvents: "auto",
      }}
    >
      {/* Icon */}
      <div
        style={{
          color: styles.icon,
          flexShrink: 0,
          marginTop: "2px",
        }}
      >
        {icons[type]}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#e8e8e8",
              marginBottom: "4px",
            }}
          >
            {title}
          </div>
        )}
        <div
          style={{
            fontSize: "13px",
            color: "#b8b8b8",
            lineHeight: 1.4,
            wordBreak: "break-word",
          }}
        >
          {message}
        </div>
      </div>

      {/* Close Button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          style={{
            flexShrink: 0,
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
            border: "none",
            borderRadius: "4px",
            color: "#8a9ba8",
            cursor: "pointer",
            transition: "background-color 0.15s ease, color 0.15s ease",
            marginTop: "-2px",
            marginRight: "-4px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.color = "#e8e8e8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#8a9ba8";
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Progress bar for auto-dismiss */}
      {duration > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "3px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "0 0 8px 8px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              backgroundColor: styles.accent,
              opacity: 0.6,
              animation: `toastProgress ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}
