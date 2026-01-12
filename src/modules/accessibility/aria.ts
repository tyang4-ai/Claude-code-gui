/**
 * ARIA and Accessibility Utilities
 *
 * Helpers for making the UI accessible.
 */

/**
 * Create a live region for screen reader announcements
 */
export function createLiveRegion(
  politeness: "polite" | "assertive" = "polite"
): HTMLDivElement {
  const region = document.createElement("div");
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", politeness);
  region.setAttribute("aria-atomic", "true");
  region.className = "sr-only";
  region.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  document.body.appendChild(region);
  return region;
}

/**
 * Announce a message to screen readers
 */
export function announce(message: string, politeness: "polite" | "assertive" = "polite"): void {
  // Find or create live region
  let region = document.querySelector(`[aria-live="${politeness}"]`) as HTMLDivElement;
  if (!region) {
    region = createLiveRegion(politeness);
  }

  // Clear and set message (triggers announcement)
  region.textContent = "";
  setTimeout(() => {
    region.textContent = message;
  }, 100);
}

/**
 * Focus trap for modals and dialogs
 */
export class FocusTrap {
  private element: HTMLElement;
  private previousActiveElement: Element | null = null;
  private handleKeyDown: ((e: KeyboardEvent) => void) | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  /**
   * Activate the focus trap
   */
  activate(): void {
    this.previousActiveElement = document.activeElement;

    // Focus first focusable element
    const firstFocusable = this.getFocusableElements()[0];
    if (firstFocusable) {
      firstFocusable.focus();
    }

    // Handle Tab key
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusables = this.getFocusableElements();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first, go to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last, go to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    this.element.addEventListener("keydown", this.handleKeyDown);
  }

  /**
   * Deactivate the focus trap
   */
  deactivate(): void {
    if (this.handleKeyDown) {
      this.element.removeEventListener("keydown", this.handleKeyDown);
      this.handleKeyDown = null;
    }

    // Restore previous focus
    if (this.previousActiveElement instanceof HTMLElement) {
      this.previousActiveElement.focus();
    }
  }

  /**
   * Get all focusable elements within the trap
   */
  private getFocusableElements(): HTMLElement[] {
    const selector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "textarea:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(", ");

    return Array.from(this.element.querySelectorAll(selector)) as HTMLElement[];
  }
}

/**
 * Skip link for keyboard navigation
 */
export function createSkipLink(target: string, text = "Skip to main content"): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = `#${target}`;
  link.className = "skip-link";
  link.textContent = text;
  link.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    padding: 8px 16px;
    z-index: 100;
    transition: top 0.2s;
  `;

  link.addEventListener("focus", () => {
    link.style.top = "0";
  });

  link.addEventListener("blur", () => {
    link.style.top = "-40px";
  });

  return link;
}

/**
 * Detect user's motion preference
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Detect user's contrast preference
 */
export function prefersHighContrast(): boolean {
  return window.matchMedia("(prefers-contrast: more)").matches;
}

/**
 * Detect user's color scheme preference
 */
export function prefersColorScheme(): "light" | "dark" | "no-preference" {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "no-preference";
}

/**
 * Common ARIA attributes for different component types
 */
export const ariaPatterns = {
  // Button that opens a dialog
  dialogTrigger: (dialogId: string) => ({
    "aria-haspopup": "dialog" as const,
    "aria-controls": dialogId,
  }),

  // Expandable section
  expandable: (expanded: boolean, contentId: string) => ({
    "aria-expanded": expanded,
    "aria-controls": contentId,
  }),

  // Tab panel
  tabPanel: (selected: boolean, labelledBy: string) => ({
    role: "tabpanel" as const,
    "aria-selected": selected,
    "aria-labelledby": labelledBy,
    tabIndex: selected ? 0 : -1,
  }),

  // Tab
  tab: (selected: boolean, controls: string) => ({
    role: "tab" as const,
    "aria-selected": selected,
    "aria-controls": controls,
    tabIndex: selected ? 0 : -1,
  }),

  // Loading state
  loading: (isLoading: boolean) => ({
    "aria-busy": isLoading,
    "aria-live": "polite" as const,
  }),

  // Error message
  error: (messageId: string) => ({
    "aria-invalid": true,
    "aria-describedby": messageId,
  }),

  // Progress indicator
  progress: (value: number, min = 0, max = 100) => ({
    role: "progressbar" as const,
    "aria-valuenow": value,
    "aria-valuemin": min,
    "aria-valuemax": max,
  }),
};
