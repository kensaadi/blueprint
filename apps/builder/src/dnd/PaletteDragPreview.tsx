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
        cursor: 'grabbing',
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

/**
 * Overlay for an EXISTING node being reordered — mirrors the NodeCard
 * header (icon + type + nodeId badge) so the ghost reads as "carrying
 * this card", with a stronger shadow + a slight lift/tilt.
 */
export function NodeDragPreview({
  atomType,
  label,
}: {
  atomType: string;
  label?: string;
}) {
  const icon = iconForType(atomType);
  return (
    <div
      className="pointer-events-none flex items-center gap-2 rounded-lg border px-3 py-2"
      style={{
        background: 'var(--bd-surface, var(--bd-item))',
        borderColor: 'var(--bd-accent)',
        color: 'var(--bd-text)',
        boxShadow: '0 14px 34px rgb(0 0 0 / 0.30)',
        // Lift + a hair of tilt so it feels physically picked up.
        transform: 'scale(1.03) rotate(-1.5deg)',
        cursor: 'grabbing',
      }}
    >
      <i
        className={`ti ti-${icon} text-[16px]`}
        style={{ color: 'var(--bd-accent)' }}
        aria-hidden
      />
      <span className="text-[13px] font-semibold">{atomType}</span>
      {label && (
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px]"
          style={{ background: 'var(--bd-item)', color: 'var(--bd-text-faint)' }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
