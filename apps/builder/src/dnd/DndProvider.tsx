/**
 * DndProvider — wraps dnd-kit's DndContext for the Builder canvas.
 *
 * Model:
 *   - Palette items are plain draggables (`{ kind: 'palette', atomType }`).
 *   - Canvas nodes are SORTABLE (see CanvasPanel `useSortable`) — each
 *     container is a SortableContext keyed by its `_uid`. Reorder,
 *     cross-container move, keyboard DnD, and drop animations all come
 *     from @dnd-kit/sortable.
 *   - Empty containers / the root expose a droppable zone
 *     (`{ kind: 'container', parentId }`) so a drop with no sibling to
 *     anchor against still lands (append).
 *
 * `onDragEnd` resolves the target container + insert index from the
 * `over` droppable — a sortable item carries its `sortable` context
 * (containerId / index / items), a zone carries its `parentId`.
 */
import { useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  type Active,
  type Over,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { useBuilderDispatch } from '../state/BuilderStateContext';
import { PaletteDragPreview } from './PaletteDragPreview';

export type PaletteDragData = { kind: 'palette'; atomType: string };
// Drag of an existing node. `uid` is its internal handle (BlueprintNode
// ._uid); `parentId` is the container it currently lives in.
export type ExistingNodeDragData = {
  kind: 'existing';
  uid: string;
  atomType: string;
  parentId: string | null;
};
// Empty-container / root drop zone. `parentId: null` targets the root
// (creates the root atom on first drop).
export type ContainerDropData = { kind: 'container'; parentId: string | null };

function isPaletteDrag(x: unknown): x is PaletteDragData {
  return !!x && typeof x === 'object' && (x as { kind?: unknown }).kind === 'palette';
}
function isExistingDrag(x: unknown): x is ExistingNodeDragData {
  return !!x && typeof x === 'object' && (x as { kind?: unknown }).kind === 'existing';
}

/** dnd-kit sortable context injected into a sortable item's data. */
type SortableInfo = { containerId: string; index: number; items: string[] };

type DropTarget = { parentId: string | null; insertBeforeId?: string };

/**
 * Resolve where a drop lands: the target container's `_uid` (`null` =
 * root zone) and the sibling to insert before (`undefined` = append).
 *
 * Over a sortable node → its SortableContext is the container; for a
 * same-container reorder we translate the sortable index to an
 * insert-before id (moving DOWN inserts after the target); a cross-
 * container / palette drop inserts before the target node. Over a zone
 * → append into that container.
 */
function resolveDrop(active: Active, over: Over): DropTarget | null {
  const od = (over.data.current ?? {}) as {
    kind?: string;
    uid?: string;
    atomType?: string;
    parentId?: string | null;
    sortable?: SortableInfo;
  };
  if (od.sortable) {
    const overContainer = od.sortable.containerId;
    const items = od.sortable.items;
    const overIndex = od.sortable.index;
    const ad = (active.data.current ?? {}) as { sortable?: SortableInfo };
    const sameContainer = ad.sortable?.containerId === overContainer;
    if (sameContainer && typeof ad.sortable?.index === 'number') {
      // Reorder within one container (works for leaf nodes AND sibling
      // containers). Moving DOWN lands after the target (before its next
      // sibling / append when last); moving UP lands before it.
      const oldIndex = ad.sortable.index;
      if (oldIndex === overIndex) return null; // dropped on itself
      const insertBeforeId =
        oldIndex < overIndex ? items[overIndex + 1] : items[overIndex];
      return { parentId: overContainer, insertBeforeId };
    }
    // Cross-container move / palette drop onto an existing node. Dropping
    // ONTO a container means "into it" (append); onto a leaf means "insert
    // before it" in the leaf's container. Using the target's atomType — not
    // an inner drop-zone hit — makes this robust to pointer precision.
    if (od.atomType && CONTAINER_TYPES.has(od.atomType) && od.uid) {
      return { parentId: od.uid, insertBeforeId: undefined };
    }
    return { parentId: overContainer, insertBeforeId: od.uid };
  }
  // A bare container drop zone (empty container / root / padding).
  if (od.kind === 'container') {
    return { parentId: od.parentId ?? null, insertBeforeId: undefined };
  }
  return null;
}

/** Atom types that hold children — dropping ONTO one means "drop into it". */
const CONTAINER_TYPES = new Set([
  'form', 'stack', 'section', 'card', 'container', 'grid', 'box',
  'tabs', 'accordion', 'tooltip', 'badge',
]);

const screenReaderInstructions = {
  draggable:
    'To pick up an element, press space or enter. While dragging, use the arrow keys to move it. Press space or enter again to drop, or escape to cancel.',
};

export function DndProvider({ children }: { children: ReactNode }) {
  const dispatch = useBuilderDispatch();
  // Preview payload for the DragOverlay — set for BOTH palette and
  // existing-node drags so a ghost follows the pointer either way.
  const [dragging, setDragging] = useState<{ atomType: string } | null>(null);

  const sensors = useSensors(
    // A small activation distance keeps a plain click on a palette item /
    // canvas card from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // sortableKeyboardCoordinates wires arrow-key reordering.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current;
    if (isPaletteDrag(data)) setDragging({ atomType: data.atomType });
    else if (isExistingDrag(data)) setDragging({ atomType: data.atomType });
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const { active, over } = e;
    if (!over) return;
    const src = active.data.current;
    const target = resolveDrop(active, over);
    if (!target) return;

    if (isPaletteDrag(src)) {
      dispatch({
        type: 'addNode',
        parentId: target.parentId,
        nodeType: src.atomType,
        insertBeforeId: target.insertBeforeId,
      });
      return;
    }
    if (isExistingDrag(src)) {
      // The root zone (parentId null) is only meaningful for the first
      // atom; an existing node can't move into it.
      if (target.parentId === null) return;
      dispatch({
        type: 'moveNode',
        id: src.uid,
        newParentId: target.parentId,
        insertBeforeId: target.insertBeforeId,
      });
    }
  };

  const onDragCancel = () => setDragging(null);

  const announcements = {
    onDragStart({ active }: { active: Active }) {
      return `Picked up ${labelOf(active)}.`;
    },
    onDragOver({ active, over }: { active: Active; over: Over | null }) {
      if (!over) return `${labelOf(active)} is no longer over a drop target.`;
      return `${labelOf(active)} is over ${labelOf(over)}.`;
    },
    onDragEnd({ active, over }: { active: Active; over: Over | null }) {
      return over ? `${labelOf(active)} was dropped onto ${labelOf(over)}.` : 'Drop cancelled.';
    },
    onDragCancel({ active }: { active: Active }) {
      return `Dragging ${labelOf(active)} was cancelled.`;
    },
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      accessibility={{ announcements, screenReaderInstructions }}
    >
      {children}
      <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
        {dragging ? <PaletteDragPreview atomType={dragging.atomType} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Human label for a11y announcements. */
function labelOf(x: Active | Over): string {
  const d = x.data.current as { atomType?: string; kind?: string } | undefined;
  return d?.atomType ?? (d?.kind === 'container' ? 'a drop zone' : 'an element');
}
