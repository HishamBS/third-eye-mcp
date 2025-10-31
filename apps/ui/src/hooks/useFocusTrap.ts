import { useEffect, useRef } from 'react';

/**
 * Focus Trap Hook - Phase 20.1
 *
 * Traps focus within a modal/dialog for keyboard accessibility
 * Per WCAG 2.1 AA: Focus management in dialogs
 * Per R04: Memoized and optimized
 */

interface UseFocusTrapOptions {
  /**
   * Whether the trap is active
   */
  readonly isActive: boolean;
  /**
   * Callback when Escape is pressed
   */
  readonly onEscape?: () => void;
}

/**
 * Traps focus within the referenced element
 * Automatically returns focus to the previously focused element when deactivated
 *
 * @param options Configuration options
 * @returns Ref to attach to the trapping container
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  options: UseFocusTrapOptions
) {
  const { isActive, onEscape } = options;
  const containerRef = useRef<T>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // Store previously focused element
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      if (!container) return [];

      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');

      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter((el) => {
        // Filter out hidden elements
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    };

    // Focus first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle tab key to trap focus
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      // Handle Tab
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement as HTMLElement;

        if (event.shiftKey) {
          // Shift+Tab: going backwards
          if (activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: going forwards
          if (activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previously focused element
      if (
        previouslyFocusedElement.current &&
        previouslyFocusedElement.current.focus
      ) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isActive, onEscape]);

  return containerRef;
}
