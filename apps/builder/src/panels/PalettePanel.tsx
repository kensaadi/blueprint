/**
 * Palette panel — left-side categorized list of atoms to drag onto canvas.
 *
 * Categories rendered as @dashforge/tw `<Accordion type="multiple">`
 * so each section can be independently collapsed/expanded. Each header
 * shows label + atom count.
 *
 * DOGFOOD notes:
 *   - G-21: Accordion chevron position is fixed to the right via
 *     internal slot; a left chevron would feel more "tree-like" for a
 *     dense palette. Proposal: `chevronPosition: 'start' | 'end'`.
 *   - G-22: Accordion item wrapper hardcodes light-mode Tailwind
 *     classes (`border-neutral-200`, `text-neutral-700/500/400`).
 *     Overridden in tokens.css scoped to `[data-app='builder']`.
 */
import { Typography, Accordion } from '@dashforge/tw';
import { useDraggable } from '@dnd-kit/core';
import { PanelShell } from '../primitives/PanelShell';
import { ATOM_CATEGORIES, type AtomEntry, type AtomCategory } from '../data/atomCatalog';
import type { PaletteDragData } from '../dnd/DndProvider';

export function PalettePanel() {
  return (
    <PanelShell
      className="w-[300px]"
      style={{ borderTop: 0, borderBottom: 0, borderLeft: 0, padding: 0 }}
      padding="0"
      role="navigation"
      ariaLabel="Atom palette"
    >
      <div className="flex h-full flex-col">
        <PaletteHeader />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CategoryAccordion />
        </div>
      </div>
    </PanelShell>
  );
}

function PaletteHeader() {
  return (
    <div
      className="flex shrink-0 items-center border-b px-4 py-3"
      style={{ borderColor: 'var(--bd-border)' }}
    >
      <Typography
        variant="caption"
        sx="text-[12px] font-medium uppercase tracking-[0.08em]"
        style={{ color: 'var(--bd-text-soft)' }}
      >
        Palette
      </Typography>
    </div>
  );
}

function CategoryAccordion() {
  // All categories start expanded so the designer sees the full
  // catalog at first glance. They can collapse individual sections to
  // focus on a specific layer (e.g., only Form atoms while building a
  // form contract).
  const allOpen = ATOM_CATEGORIES.map((c) => c.id);
  return (
    <Accordion
      type="multiple"
      defaultValue={allOpen}
      items={ATOM_CATEGORIES.map((cat) => ({
        value: cat.id,
        header: <CategoryHeader cat={cat} />,
        content: <CategoryContent cat={cat} />,
      }))}
    />
  );
}

function CategoryHeader({ cat }: { cat: AtomCategory }) {
  return (
    <div className="flex w-full items-center pl-4">
      <Typography
        variant="caption"
        sx="text-[14px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: 'var(--bd-text)' }}
      >
        {cat.label}
      </Typography>
    </div>
  );
}

function CategoryContent({ cat }: { cat: AtomCategory }) {
  // Uses native Tailwind `flex flex-col gap-*` instead of Stack because
  // dashforge/tw's Stack silently drops its own variant classes when a
  // custom className is passed — the element renders as `display: block`
  // with no gap. See G-28 in BUILDER-DOGFOOD-REPORT.md.
  return (
    <div className="flex flex-col gap-2 py-2 pl-4 pr-3">
      {cat.atoms.map((atom) => (
        <PaletteItem key={atom.type} atom={atom} />
      ))}
    </div>
  );
}

function PaletteItem({ atom }: { atom: AtomEntry }) {
  // Each palette atom is a dnd-kit draggable. We deliberately do NOT
  // render a preview via `transform` here — the DragOverlay in
  // DndProvider owns the floating preview so it doesn't get clipped by
  // the palette's overflow-y-auto scroll container.
  const data: PaletteDragData = { kind: 'palette', atomType: atom.type };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${atom.type}`,
    data,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      className="bd-item flex w-full cursor-grab items-center gap-3 rounded-md px-3.5 py-2.5 text-left text-[15px] font-medium active:cursor-grabbing"
      style={{ opacity: isDragging ? 0.4 : 1 }}
      title={`Drag ${atom.type} onto canvas`}
    >
      <i
        className={`ti ti-${atom.icon} shrink-0 text-[20px]`}
        style={{ color: 'var(--bd-text-soft)' }}
        aria-hidden
      />
      <span>{atom.type}</span>
    </button>
  );
}
