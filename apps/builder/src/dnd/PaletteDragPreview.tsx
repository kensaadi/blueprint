/**
 * Floating preview that mirrors a PaletteItem under the cursor while
 * dragging. Rendered inside dnd-kit's <DragOverlay> so it escapes any
 * scroll containers.
 *
 * Kept purely presentational — no state, no store access. That way
 * DragOverlay can mount / unmount it on every drag without cost.
 */
import { iconForType } from '../data/typeIcons';

export function PaletteDragPreview({ atomType }: { atomType: string }) {
  const icon = iconForType(atomType);
  return (
    <div
      className="pointer-events-none flex items-center gap-2.5 rounded-md px-3 py-2 text-[14px] font-medium shadow-lg"
      style={{
        background: 'var(--bd-item)',
        border: '1px solid var(--bd-accent)',
        color: 'var(--bd-text)',
        boxShadow: '0 8px 24px rgb(0 0 0 / 0.25)',
        // Slight lift so the ghost feels like it detaches from the palette
        transform: 'scale(1.02)',
      }}
    >
      <i
        className={`ti ti-${icon} text-[18px]`}
        style={{ color: 'var(--bd-accent)' }}
        aria-hidden
      />
      <span>{atomType}</span>
    </div>
  );
}
