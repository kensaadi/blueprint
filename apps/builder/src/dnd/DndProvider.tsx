/**
 * DndProvider — wraps dnd-kit's DndContext for the Builder canvas.
 *
 * Responsibilities:
 *   - Own the "currently dragging" state so <DragOverlay> can render a
 *     floating preview that follows the pointer across scroll containers
 *   - Translate a valid drop into a `dispatch({ type: 'addNode', … })`
 *     against the BuilderState reducer
 *
 * Payload contracts — kept in TS so a stray drop can't crash the tree:
 *   - Palette draggable   → data: `{ kind: 'palette', atomType: string }`
 *   - Canvas droppable    → data: `{ kind: 'container', parentId: string }`
 *
 * A11y: default sensors (Pointer + Keyboard) are wired but keyboard
 * activation still needs a dedicated palette-focus + inspector-ARIA
 * pass, deferred to Phase 3g polish.
 */
import { useState, type ReactNode } from 'react';
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor, KeyboardSensor, pointerWithin, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { useBuilderDispatch } from '../state/BuilderStateContext';
import { PaletteDragPreview } from './PaletteDragPreview';

export type PaletteDragData = { kind: 'palette'; atomType: string };
// Drag of an existing node in the canvas tree — used for reorder /
// re-parenting. The reducer refuses cyclic drops (parent into own
// descendant); this data shape doesn't need to encode that guard.
export type ExistingNodeDragData = { kind: 'existing'; nodeId: string; atomType: string };
// `parentId: null` targets the empty root drop zone (creates the root
// atom on first drop). Non-null targets a container's inner area.
export type ContainerDropData = { kind: 'container'; parentId: string | null };
/**
 * "Insert before" drop strip rendered above each existing sibling.
 * Lets the user place a dragged node at an exact position in a list
 * (Grid → Grid, Card → Card, …) without having to aim at the parent
 * container's inner dashed area — the source of the "can't move Grid
 * over another Grid" complaint before this landed.
 */
export type ReorderDropData = {
  kind: 'reorder';
  parentId: string;
  insertBeforeId: string;
};

/**
 * Type guards. We treat the `data.current` field from dnd-kit as
 * `unknown` and narrow explicitly — cheaper than fighting generics
 * across the whole tree.
 */
function isPaletteDrag(x: unknown): x is PaletteDragData {
  return !!x && typeof x === 'object' && (x as { kind?: unknown }).kind === 'palette';
}
function isExistingDrag(x: unknown): x is ExistingNodeDragData {
  return !!x && typeof x === 'object' && (x as { kind?: unknown }).kind === 'existing';
}
function isContainerDrop(x: unknown): x is ContainerDropData {
  return !!x && typeof x === 'object' && (x as { kind?: unknown }).kind === 'container';
}
function isReorderDrop(x: unknown): x is ReorderDropData {
  return !!x && typeof x === 'object' && (x as { kind?: unknown }).kind === 'reorder';
}

export function DndProvider({ children }: { children: ReactNode }) {
  const dispatch = useBuilderDispatch();
  // Preview payload for the DragOverlay — set for BOTH palette drags and
  // existing-node drags so a ghost follows the pointer either way.
  const [dragging, setDragging] = useState<{ atomType: string } | null>(null);

  // PointerSensor's activationConstraint prevents the drag from
  // hijacking a plain click on the palette item — a small distance
  // has to be travelled before a drag starts.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current;
    // Both palette and existing-node drags get a floating ghost. The
    // source card only fades to 0.35 opacity in place (its transform is
    // never applied), so without an overlay an existing-node drag had
    // nothing following the pointer — it read as "dead".
    if (isPaletteDrag(data)) setDragging({ atomType: data.atomType });
    else if (isExistingDrag(data)) setDragging({ atomType: data.atomType });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const src = e.active.data.current;
    const dst = e.over?.data.current;

    // Palette drop → add a new node under the target container.
    if (isPaletteDrag(src) && isContainerDrop(dst)) {
      dispatch({ type: 'addNode', parentId: dst.parentId, nodeType: src.atomType });
      return;
    }

    // Existing-node drop → either append into a container (existing
    // behavior) or insert before a sibling (new — solves Grid→Grid).
    if (!isExistingDrag(src)) return;

    if (isReorderDrop(dst)) {
      // Insert-before another sibling under `parentId`.
      dispatch({
        type: 'moveNode',
        id: src.nodeId,
        newParentId: dst.parentId,
        insertBeforeId: dst.insertBeforeId,
      });
      return;
    }
    if (isContainerDrop(dst)) {
      // Moving into the empty root drop zone is meaningless once a
      // root already exists — the reducer no-ops on null parent.
      if (dst.parentId === null) return;
      dispatch({ type: 'moveNode', id: src.nodeId, newParentId: dst.parentId });
    }
  };

  const onDragCancel = () => setDragging(null);

  return (
    <DndContext
      sensors={sensors}
      // `pointerWithin`: the drop target is whichever droppable rect
      // contains the current pointer position. Without this, dnd-kit
      // uses `rectIntersection` on the DragOverlay's rect — our
      // preview is a small pill, so intersection with the drop zone
      // was flaky and often left `over === null` at drop time,
      // silently discarding the drop.
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {children}
      {/*
       * `snapCenterToCursor` re-centers the overlay on the pointer.
       * Without it, dnd-kit anchors the overlay to the ORIGINAL rect
       * of the draggable — so a small preview appears floating above
       * and to the left of the cursor whenever the palette item was
       * wider than the preview itself.
       */}
      <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
        {dragging ? <PaletteDragPreview atomType={dragging.atomType} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
