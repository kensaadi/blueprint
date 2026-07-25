/**
 * Focus trap for modal overlays.
 *
 * When `open` flips to `true`, the hook:
 *   - Remembers the element that had focus (to restore later)
 *   - Intercepts Tab/Shift+Tab on the modal root so focus cycles
 *     between the first and last focusable descendants inside
 *   - Does NOT move focus itself (the modal already focuses its
 *     search input; we just trap what happens next)
 *
 * When it flips back to `false`, focus is restored to the previously
 * focused element — screen-reader users and keyboard-only users can
 * always find their way back to where they were.
 */
import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  open: boolean,
) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = containerRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('inert') && el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // Restore focus so screen readers land on the trigger element.
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, containerRef]);
}
