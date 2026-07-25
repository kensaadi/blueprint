/**
 * FieldHint — the ⓘ icon that surfaces the tooltip on hover / focus.
 *
 * Why the portal:
 *   The Inspector's panel uses `overflow: auto` for its own scroll,
 *   which clips anything that extends beyond its width. A CSS-only
 *   tooltip anchored next to the icon disappears halfway on wide
 *   hints. The tooltip needs to escape the panel — we portal it into
 *   `document.body` and position it with `fixed` coords computed from
 *   the icon's bounding rect.
 *
 * Positioning strategy:
 *   - Prefer LEFT of the icon (Inspector is on the right of the
 *     screen, so leftward growth uses the canvas real-estate).
 *   - If there isn't 260px of headroom on the left (shouldn't happen
 *     with a 300px Inspector, but be defensive), fall back to right.
 *   - Vertically centered on the icon; nudged into the viewport if
 *     the label sits near the top or bottom edge.
 *
 * Accessibility:
 *   - `role="tooltip"` on the popover.
 *   - `aria-describedby` links the trigger to the popover so screen
 *     readers announce the hint on focus.
 *   - The wrapper is focusable (`tabIndex={0}`) so keyboard users can
 *     reveal the tooltip without a pointer.
 */
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_WIDTH = 260;
const OFFSET = 10; // gap between trigger and tooltip

export function FieldHint({ text }: { text: string | undefined }) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const id = useId();

  // Compute (and re-compute on scroll / resize while open) the
  // fixed-position coordinates for the tooltip. Called from a
  // useLayoutEffect so the tooltip appears already positioned in the
  // first paint after open.
  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Try left-of-trigger first; fall back to right if there's no room.
    let left = r.left - TOOLTIP_WIDTH - OFFSET;
    if (left < 8) left = r.right + OFFSET;
    // Clamp vertically so the tooltip doesn't fall off screen when
    // the label sits near the top or bottom edge.
    let top = r.top + r.height / 2 - 20;
    if (top < 8) top = 8;
    if (top > vh - 80) top = vh - 80;
    // Ensure horizontal clamp too — if both left and right overflow
    // we just pin to the right edge with an 8px margin.
    if (left + TOOLTIP_WIDTH > vw - 8) left = vw - TOOLTIP_WIDTH - 8;
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    // Track scroll and resize so the tooltip follows the icon while
    // the Inspector's scroll or the viewport changes underneath.
    const onWin = () => reposition();
    window.addEventListener('scroll', onWin, true);
    window.addEventListener('resize', onWin);
    return () => {
      window.removeEventListener('scroll', onWin, true);
      window.removeEventListener('resize', onWin);
    };
  }, [open, reposition]);

  // Delay-free open on pointer/focus; close on leave/blur/escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!text) return null;

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex items-center align-middle"
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        aria-label={text}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <i
          className="ti ti-info-circle text-[12px]"
          style={{ color: 'var(--bd-text-faint)', cursor: 'help' }}
          aria-hidden
        />
      </span>
      {open && pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            className="pointer-events-none fixed rounded-md border px-2.5 py-2 text-[12px] leading-snug shadow-lg"
            style={{
              top: pos.top,
              left: pos.left,
              width: TOOLTIP_WIDTH,
              zIndex: 1000,
              background: 'var(--bd-header)',
              borderColor: 'var(--bd-accent)',
              color: 'var(--bd-text)',
              boxShadow: '0 8px 24px rgb(0 0 0 / 0.35)',
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
