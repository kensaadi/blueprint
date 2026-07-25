/**
 * Canvas panel — center surface where the contract wireframe appears.
 *
 * Phase 3a rendering: each `BlueprintNode` is drawn as a placeholder
 * card showing type + id. Container nodes render their children
 * recursively inside a dashed inner area. The card is clickable and
 * dispatches `selectNode(id)` — that's what lights up the Inspector.
 *
 * Click on the canvas background (outside any card) → deselect. This
 * mimics Figma / Sketch canvas semantics and gives users a clear way
 * to close the Inspector without keyboard shortcuts.
 *
 * Phase 3c will replace the placeholder cards with the actual wireframe
 * preview (schema-driven), and wire the drop mechanic that turns the
 * dashed inner area into a real drop target.
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import { Typography } from '@dashforge/tw';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useBuilderState, useBuilderDispatch } from '../state/BuilderStateContext';
import { useIsCollapsed, useToggleCollapse } from '../state/CollapseContext';
import type { BlueprintNode } from '../state/types';
import type {
  ContainerDropData,
  ExistingNodeDragData,
  ReorderDropData,
} from '../dnd/DndProvider';
import { iconForType } from '../data/typeIcons';
import { isAtomName } from '@dashforge/blueprint-core';
import { TEMPLATES } from '../templates/library';
import { RecentFilesGrid } from './RecentFilesGrid';

/** Types recognised as containers — they render an inner drop area. */
const CONTAINER_TYPES = new Set([
  'form', 'stack', 'section', 'card', 'container', 'grid', 'box',
  'tabs', 'accordion',
]);


export function CanvasPanel() {
  const { contract, selectedId, hoveredId } = useBuilderState();
  const dispatch = useBuilderDispatch();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the hovered card into view. The palette's hover-preview
  // outlines the target node, but on a tall tree the outline lives off
  // screen — pull it back in so the user can actually see it.
  //
  // Scoped to this canvas so a Cmd+K preview won't hijack the browser
  // scroll or fight the drawer beneath. `block: 'nearest'` avoids the
  // ping-pong you'd get from `'center'` when moving the cursor row by
  // row through a list of siblings.
  useEffect(() => {
    if (!hoveredId) return;
    const root = scrollRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(
      `[data-node-id="${CSS.escape(hoveredId)}"]`,
    );
    // `behavior: 'auto'` (default) — a smooth scroll is nicer visually
    // but browsers cancel it if a re-render fires mid-animation. In
    // the palette that happens on every keystroke, and the user ends
    // up with a stationary offline card. Instant scroll survives.
    target?.scrollIntoView({ block: 'nearest' });
  }, [hoveredId]);

  return (
    <div
      ref={scrollRef}
      className="bd-grid flex-1 overflow-y-auto p-10"
      style={{ background: 'var(--bd-canvas)' }}
      onClick={() => dispatch({ type: 'select', id: null })}
      role="main"
      aria-label="Contract canvas"
    >
      <div className="mx-auto max-w-3xl">
        {contract.root === null ? (
          <>
            <RootDropZone />
            <RecentFilesGrid />
            <TemplatePicker />
          </>
        ) : (
          <NodeCard
            node={contract.root}
            selectedId={selectedId}
            hoveredId={hoveredId}
            depth={0}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Empty-contract drop target. Any atom dropped here becomes the root.
 * We deliberately keep this visually distinct from a container's inner
 * drop zone: it's larger, centered, and messaged as an invitation
 * rather than a "keep adding" hint.
 */
function RootDropZone() {
  const data: ContainerDropData = { kind: 'container', parentId: null };
  const { setNodeRef, isOver } = useDroppable({
    id: 'drop:__root__',
    data,
  });
  return (
    <div
      ref={setNodeRef}
      className="flex min-h-[420px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors"
      style={{
        borderColor: isOver ? 'var(--bd-accent)' : 'var(--bd-border-strong)',
        background: isOver ? 'var(--bd-accent-bg)' : 'transparent',
      }}
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'var(--bd-accent-bg)' }}
      >
        <i
          className="ti ti-arrow-down-to-arc text-[32px]"
          style={{ color: 'var(--bd-accent)' }}
          aria-hidden
        />
      </div>
      <Typography
        variant="body1"
        className="text-[18px] font-medium"
        style={{ color: 'var(--bd-text)' }}
      >
        Drop any atom to start
      </Typography>
      <Typography
        variant="caption"
        className="mt-2 max-w-md text-center text-[14px] leading-relaxed"
        style={{ color: 'var(--bd-text-soft)' }}
      >
        The first atom becomes the root. It can be a form, a page, a stack
        — whatever your contract needs to describe.
      </Typography>
    </div>
  );
}

/**
 * Template picker — shown below the empty-state drop zone so the
 * designer has a one-click alternative to building from scratch.
 * Clicking a template replaces the empty contract with the seeded one.
 */
function TemplatePicker() {
  const dispatch = useBuilderDispatch();
  return (
    <div className="mt-8">
      <Typography
        variant="caption"
        className="mb-3 block text-center text-[12px] font-medium uppercase tracking-[0.1em]"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        Or start from a template
      </Typography>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: 'replaceContract', contract: t.contract });
            }}
            className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors"
            style={{
              borderColor: 'var(--bd-border)',
              background: 'var(--bd-panel)',
              color: 'var(--bd-text)',
            }}
          >
            <div className="flex items-center gap-2">
              <i
                className={`ti ti-${t.icon} text-[20px]`}
                style={{ color: 'var(--bd-accent)' }}
                aria-hidden
              />
              <Typography
                variant="body2"
                className="text-[14px] font-semibold"
                style={{ color: 'var(--bd-text)' }}
              >
                {t.name}
              </Typography>
            </div>
            <Typography
              variant="caption"
              className="text-[12px] leading-relaxed"
              style={{ color: 'var(--bd-text-soft)' }}
            >
              {t.description}
            </Typography>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Small × button on the NodeCard header. Only visible when the card
 * is selected (Figma-style: chrome only around the current selection).
 *
 * Handler details:
 *   - `stopPropagation` on click so the click doesn't select-and-lose
 *     focus race with the reducer, and doesn't bubble to the outer
 *     canvas deselect handler.
 *   - `stopPropagation` on pointerdown so dnd-kit's PointerSensor
 *     never sees the initial press — otherwise a tiny drag jitter
 *     could start moving the card instead of firing the click.
 */
function NodeDeleteButton({
  nodeId,
  visible,
}: {
  nodeId: string;
  visible: boolean;
}) {
  const dispatch = useBuilderDispatch();
  if (!visible) return null;
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: 'removeNode', id: nodeId });
      }}
      className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
      style={{
        background: 'transparent',
        color: 'var(--bd-text-soft)',
        border: '1px solid var(--bd-border)',
      }}
      aria-label="Delete node"
      title="Delete node (or press Delete / Backspace)"
    >
      <i className="ti ti-x text-[12px]" aria-hidden />
    </button>
  );
}

/**
 * Drop zone for a container's children. Highlights on hover with the
 * accent ring so the designer sees the target before releasing.
 *
 * Nested containers each have their own drop zone; dnd-kit resolves
 * the smallest enclosing target automatically (`rectIntersection` is
 * the default collision detector).
 */
function ContainerDropZone({
  parentId,
  layoutStyle,
  children,
}: {
  parentId: string;
  /**
   * Extra CSS applied on the drop zone to mirror the parent's
   * intended layout — CSS grid track for `grid` parents, flex-row
   * for `stack` parents with `direction: row`. Absent means default
   * vertical stacking.
   */
  layoutStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const data: ContainerDropData = { kind: 'container', parentId };
  const { setNodeRef, isOver } = useDroppable({
    id: `drop:${parentId}`,
    data,
  });
  return (
    <div
      ref={setNodeRef}
      className="mx-3 mb-3 rounded-md border border-dashed p-3 transition-colors"
      style={{
        borderColor: isOver ? 'var(--bd-accent)' : 'var(--bd-border-strong)',
        background: isOver ? 'var(--bd-accent-bg)' : 'var(--bd-canvas)',
        ...layoutStyle,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Compute the CSS grid / flex layout the Builder should mimic for a
 * given container's drop zone. Only reads static props — the visual
 * fidelity matches what the runtime renders, no runtime state required.
 */
function containerLayoutStyle(node: BlueprintNode): React.CSSProperties | undefined {
  if (node.type === 'grid') {
    const rawCols = (node.props as Record<string, unknown>).cols;
    const cols =
      typeof rawCols === 'number' && rawCols > 0
        ? rawCols
        : rawCols && typeof rawCols === 'object'
          ? Number((rawCols as { base?: number; md?: number }).md ??
              (rawCols as { base?: number }).base ?? 1)
          : 1;
    const hasHints = node.children.some(
      (c) => c.layoutHint?.size !== undefined,
    );
    return {
      display: 'grid',
      gridTemplateColumns: hasHints
        ? 'repeat(12, 1fr)'
        : `repeat(${Math.max(1, Math.min(12, cols))}, minmax(0, 1fr))`,
      gap: 8,
    };
  }
  if (node.type === 'stack') {
    // Mirror stack.direction + wrap + justify + align on the drop
    // zone. Column stack is the default vertical stacking so only
    // `wrap`/`justify` need explicit reflection there.
    const props = node.props as {
      direction?: string;
      wrap?: boolean;
      justify?: 'start' | 'center' | 'end' | 'between' | 'around';
      align?: 'start' | 'center' | 'end' | 'stretch';
    };
    const isRow = props.direction === 'row';
    if (isRow || props.wrap || props.justify || props.align) {
      const justifyMap: Record<string, string> = {
        start: 'flex-start',
        center: 'center',
        end: 'flex-end',
        between: 'space-between',
        around: 'space-around',
      };
      const alignMap: Record<string, string> = {
        start: 'flex-start',
        center: 'center',
        end: 'flex-end',
        stretch: 'stretch',
      };
      return {
        display: 'flex',
        flexDirection: isRow ? 'row' : 'column',
        flexWrap: props.wrap ? 'wrap' : undefined,
        justifyContent: props.justify ? justifyMap[props.justify] : undefined,
        alignItems: props.align ? alignMap[props.align] : undefined,
        gap: 8,
      };
    }
  }
  // Every other container (`card`, `section`, `box`, `container`)
  // renders children as a vertical column by default — same as the
  // runtime — so we don't override the drop zone's block layout.
  return undefined;
}

/**
 * Bootstrap-style span → `grid-column: span N` for a child sitting
 * inside a grid parent. When the child has no explicit hint we fall
 * back to the parent's `cols`-derived default so unhinted items keep
 * their equal-share layout.
 */
function childGridSpan(
  child: BlueprintNode,
  parentCols: number,
): number {
  const size = child.layoutHint?.size;
  if (typeof size === 'number') return Math.max(1, Math.min(12, Math.round(size)));
  if (size && typeof size === 'object') {
    // Prefer md > base for the desktop-first canvas preview.
    const md = size.md ?? size.base;
    if (typeof md === 'number') return Math.max(1, Math.min(12, Math.round(md)));
  }
  return Math.max(1, Math.min(12, Math.round(12 / Math.max(1, parentCols))));
}

function NodeCard({
  node,
  selectedId,
  hoveredId,
  depth,
  wrapperStyle,
  skipStackMargin,
}: {
  node: BlueprintNode;
  selectedId: string | null;
  hoveredId: string | null;
  depth: number;
  /** Extra CSS injected by the grid parent — `gridColumn: span N`. */
  wrapperStyle?: React.CSSProperties;
  /**
   * Disable the historical `marginTop: 8` used to separate stacked
   * children — the parent is a grid/row and handles gap itself.
   */
  skipStackMargin?: boolean;
}) {
  const dispatch = useBuilderDispatch();
  const isSelected = node.id === selectedId;
  // Transient palette outline. Loses to real selection if both point
  // at the same node — the selection ring is more informative.
  const isHovered = !isSelected && node.id === hoveredId;
  const isContainer = CONTAINER_TYPES.has(node.type);
  const icon = iconForType(node.type);
  const childCount = node.children?.length ?? 0;
  const canCollapse = isContainer && childCount > 0;
  const collapsedRaw = useIsCollapsed(node.id);
  const isCollapsed = canCollapse && collapsedRaw;
  const toggleCollapse = useToggleCollapse();

  // Fire a one-shot flash whenever this card becomes selected. The
  // ref survives re-renders, so we only trigger on the false → true
  // transition — updating props on the same selected node doesn't
  // relit the animation. A cheap way to make palette handoffs feel
  // deliberate ("that's the node I picked").
  const wasSelectedRef = useRef(false);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const becameSelected = isSelected && !wasSelectedRef.current;
    wasSelectedRef.current = isSelected;
    if (!becameSelected) return;
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 700);
    return () => window.clearTimeout(t);
  }, [isSelected]);
  // Root can't be moved — locking it out of the drag also avoids the
  // ambiguity of "drag the root into itself" mid-motion.
  const isRoot = depth === 0;

  // Non-root nodes become drag sources. Payload declares "this is an
  // existing node" so the reducer routes into `moveNode` instead of
  // `addNode` at drop time.
  const dragData: ExistingNodeDragData = { kind: 'existing', nodeId: node.id };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `node:${node.id}`,
    data: dragData,
    disabled: isRoot,
  });

  return (
    <div
      ref={isRoot ? undefined : setNodeRef}
      {...(isRoot ? {} : attributes)}
      {...(isRoot ? {} : listeners)}
      data-node-id={node.id}
      onClick={(e) => {
        // Stop propagation so clicking a nested node doesn't bubble to
        // the outer canvas deselect handler.
        e.stopPropagation();
        dispatch({ type: 'select', id: node.id });
      }}
      className={`rounded-lg border transition-colors${flash ? ' bd-flash' : ''}`}
      style={{
        // Selection wins over hover: accent ring for real selection,
        // dashed accent border for the palette's transient preview.
        borderColor: isSelected || isHovered ? 'var(--bd-accent)' : 'var(--bd-border)',
        borderStyle: isHovered ? 'dashed' : 'solid',
        background: 'var(--bd-surface, var(--bd-item))',
        boxShadow: isSelected ? '0 0 0 1px var(--bd-accent)' : undefined,
        // Only insert the historical row-gap when the parent is a
        // vertical stack of cards. Grid / flex-row parents provide
        // their own gap via the drop zone layout style.
        marginTop: skipStackMargin || depth === 0 ? 0 : 8,
        cursor: isRoot ? 'pointer' : 'grab',
        opacity: isDragging ? 0.35 : 1,
        // Parent grid injects `gridColumn: span N` here so the card
        // occupies the right cell width without an extra wrapper div.
        ...wrapperStyle,
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {canCollapse ? (
          <button
            type="button"
            aria-label={isCollapsed ? 'Expand container' : 'Collapse container'}
            aria-expanded={!isCollapsed}
            onClick={(e) => {
              // Don't select the card + don't start a drag on the parent
              // when the user just meant to fold/unfold.
              e.stopPropagation();
              toggleCollapse(node.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors"
            style={{ color: 'var(--bd-text-soft)' }}
          >
            <i
              className={`ti ti-chevron-${isCollapsed ? 'right' : 'down'} text-[14px]`}
              aria-hidden
            />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden />
        )}
        <i
          className={`ti ti-${icon} text-[16px]`}
          style={{ color: isSelected ? 'var(--bd-accent)' : 'var(--bd-text-soft)' }}
          aria-hidden
        />
        <Typography
          variant="caption"
          className="text-[13px] font-semibold"
          style={{ color: 'var(--bd-text)' }}
        >
          {node.type}
        </Typography>
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px]"
          style={{ background: 'var(--bd-item)', color: 'var(--bd-text-faint)' }}
        >
          {node.id}
        </span>
        {isCollapsed && (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              background: 'var(--bd-item)',
              color: 'var(--bd-text-soft)',
            }}
            title={`${childCount} hidden ${childCount === 1 ? 'child' : 'children'}`}
          >
            · {childCount} {childCount === 1 ? 'item' : 'items'}
          </span>
        )}
        {!isAtomName(node.type) && (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em]"
            style={{ background: 'var(--bd-accent-bg)', color: 'var(--bd-accent)' }}
            title="Not a catalog atom — bound at runtime via customNodes"
          >
            User-defined
          </span>
        )}
        {isContainer && childCount === 0 && (
          // Empty container badge — the runtime renders exactly what's
          // in the contract, so an empty container with no padding
          // collapses to zero height at runtime. The Canvas Drop-atoms
          // placeholder is Builder chrome, not real content — this
          // badge closes the gap between "what I see here" and "what
          // ships". Legitimate if content is injected via slots or
          // customNodes; the diagnostic in useValidation lists it too.
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em]"
            style={{
              background: 'var(--bd-warn-bg, #fef3c7)',
              color: 'var(--bd-warn, #92400e)',
            }}
            title="This container has no children — it will render as 0px at runtime unless content is injected via slots."
          >
            Empty
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {!isRoot && (
            <i
              className="ti ti-grip-vertical text-[14px]"
              style={{
                color: 'var(--bd-text-faint)',
                cursor: 'grab',
              }}
              title="Drag to reorder or reparent"
              aria-hidden
            />
          )}
          <NodeDeleteButton nodeId={node.id} visible={isSelected} />
        </div>
      </div>

      {isContainer && !isCollapsed && (() => {
        const layoutStyle = containerLayoutStyle(node);
        // Grid needs to split its 12 columns between the children;
        // resolve `cols` once so per-child `span` maths stays cheap.
        const rawCols = (node.props as Record<string, unknown>).cols;
        const cols =
          typeof rawCols === 'number' && rawCols > 0
            ? rawCols
            : rawCols && typeof rawCols === 'object'
              ? Number((rawCols as { base?: number; md?: number }).md ??
                  (rawCols as { base?: number }).base ?? 1)
              : 1;
        const parentIsGrid = node.type === 'grid';
        // Any stack that ends up with a flex layout (row, wrapped,
        // aligned, justified) uses its `gap` instead of the per-child
        // marginTop — otherwise cards would inherit both.
        const parentIsFlexStack =
          node.type === 'stack' && layoutStyle !== undefined;
        return (
          <ContainerDropZone parentId={node.id} layoutStyle={layoutStyle}>
            {node.children.length === 0 ? (
              <Typography
                variant="caption"
                className="block text-center text-[12px]"
                style={{ color: 'var(--bd-text-faint)' }}
              >
                Drop atoms here
              </Typography>
            ) : (
              node.children.map((c, idx) => {
                // Only pin a `grid-column: span N` when the child
                // opts in with a layoutHint. Without hints, the grid
                // is in equal-fill mode and CSS auto-placement gives
                // each card one cell — an explicit span here would
                // over-shoot the `repeat(cols, 1fr)` template.
                const gridStyle =
                  parentIsGrid && c.layoutHint?.size !== undefined
                    ? { gridColumn: `span ${childGridSpan(c, cols)}` }
                    : undefined;
                return (
                  <Fragment key={c.id}>
                    {/*
                      Insert-before drop strip. Renders above each
                      sibling as a thin band; when an existing node is
                      dragged over it, a colored line appears and the
                      drop targets "put me right before this sibling".
                      Solves Grid→Grid reorder (which the original
                      container-only drop scheme couldn't reach).
                      Skipped when parent is a grid — the strip would
                      become a grid child and consume a cell, pushing
                      hinted siblings out of their `grid-column: span N`
                      slots. Grid reorder still works via drag on the
                      cards themselves.
                    */}
                    {!parentIsGrid && (
                      <ReorderStrip
                        parentId={node.id}
                        insertBeforeId={c.id}
                        index={idx}
                      />
                    )}
                    <NodeCard
                      node={c}
                      selectedId={selectedId}
                      hoveredId={hoveredId}
                      depth={depth + 1}
                      wrapperStyle={gridStyle}
                      skipStackMargin={parentIsGrid || parentIsFlexStack}
                    />
                  </Fragment>
                );
              })
            )}
          </ContainerDropZone>
        );
      })()}
    </div>
  );
}

/**
 * Thin "insert before this sibling" drop band. Invisible by default
 * (2px transparent band with generous hit area); turns into a solid
 * accent bar when an existing-node drag hovers over it. Only reacts
 * to existing-node drags; palette drops still land on the container's
 * inner drop area.
 *
 * The hit area is 8px tall (half above, half below the visible line)
 * so users don't have to be pixel-perfect. Zero cost when idle — the
 * band is `pointer-events: none` unless dnd-kit registers a hover.
 */
function ReorderStrip({
  parentId,
  insertBeforeId,
  index,
}: {
  parentId: string;
  insertBeforeId: string;
  index: number;
}) {
  const data: ReorderDropData = { kind: 'reorder', parentId, insertBeforeId };
  const { setNodeRef, isOver } = useDroppable({
    id: `reorder:${parentId}:${insertBeforeId}`,
    data,
  });
  return (
    <div
      ref={setNodeRef}
      data-reorder-strip
      data-reorder-index={index}
      style={{
        height: 8,
        marginTop: index === 0 ? 0 : -4,
        marginBottom: -4,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '3px 4px',
          borderRadius: 2,
          background: isOver ? 'var(--bd-accent)' : 'transparent',
          opacity: isOver ? 1 : 0,
          transition: 'opacity 120ms',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
