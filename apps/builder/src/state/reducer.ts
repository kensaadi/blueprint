/**
 * Builder state reducer — pure, immutable, undo-ready.
 *
 * All contract mutations flow through this reducer. Kept pure so we
 * can later plug in an undo/redo stack (Phase 3g, BUILDER-V2-DESIGN.md
 * §13) simply by memoizing the state history — no reactor rewrite.
 *
 * Tree traversal uses recursive `map` helpers rather than a flat
 * lookup table. At palette-scale contracts (tens of nodes) this is
 * fast enough and keeps the state shape simple; a flat map would
 * complicate serialization (the exported JSON is naturally recursive).
 */
import type { BlueprintNode, BuilderState } from './types';
import { createNode } from './factory';

export type BuilderAction =
  // `parentId: null` means "set as root". Only allowed while the tree
  // has no root; otherwise the reducer no-ops so a stray null-parent
  // drop cannot clobber an existing contract.
  | { type: 'select'; id: string | null }
  // Transient outline for the palette's hover-preview. Never pushed
  // to history — see `isSelectionOnly` in history.ts.
  | { type: 'hover'; id: string | null }
  | { type: 'addNode'; parentId: string | null; nodeType: string }
  | { type: 'updateProps'; id: string; patch: Record<string, unknown> }
  // Rename the envelope-level `node.id`. Used by the Inspector when
  // the user names their form/tabs/section for `<DashBlueprint forms>`
  // / `slots` lookup. Duplicate ids across the tree are allowed at
  // the reducer level; the validator flags them separately.
  | { type: 'setNodeId'; id: string; newId: string }
  // Rename the atom `type` string. Meant for custom-typed nodes (not
  // in the catalog) — the user picks a distinctive name so the host's
  // customNodes map can bind against it. Retyping a catalog atom is
  // legal at the reducer level but the Inspector only exposes this
  // control for user-defined types to avoid accidental damage.
  | { type: 'setNodeType'; id: string; newType: string }
  // Set / clear the layoutHint envelope. Value `undefined` removes it
  // entirely so the JSON export stays clean.
  | { type: 'setLayoutHint'; id: string; value: unknown }
  // Patch one of the three state axes (visibility / disabled / access)
  // or the `slots` map on a node. Setting the value to `undefined`
  // deletes the axis so it doesn't ship in the exported JSON.
  | {
      type: 'setNodeAxis';
      id: string;
      axis: 'visibility' | 'disabled' | 'access' | 'slots';
      value: unknown;
    }
  | { type: 'removeNode'; id: string }
  // Move an existing node to a different container. Guards:
  // - can't move the root
  // - can't move a node into itself or a descendant
  | {
      type: 'moveNode';
      id: string;
      newParentId: string;
      /**
       * When set, insert the moved node immediately BEFORE the sibling
       * with this id under `newParentId`. When omitted or unresolved,
       * append at the end (previous behavior). Passing the moved
       * node's own id is treated as append.
       */
      insertBeforeId?: string;
    }
  | { type: 'replaceContract'; contract: BuilderState['contract'] }
  // Point the buffer at a saved file — used after Open, Save-As, or
  // rename. `fileRef: null` means "back to untitled".
  | { type: 'setFileRef'; fileRef: BuilderState['fileRef'] }
  // Swap the entire buffer at once (contract + fileRef) — the Open
  // command uses this so the reducer doesn't have to sequence two
  // dispatches.
  | {
      type: 'openFile';
      contract: BuilderState['contract'];
      fileRef: BuilderState['fileRef'];
    };

/**
 * Recursively rebuild the tree, applying `visit` to each node. If
 * `visit` returns the same reference we short-circuit and reuse the
 * subtree — React's memoization stays cheap on unrelated branches.
 */
function mapTree(
  node: BlueprintNode,
  visit: (n: BlueprintNode) => BlueprintNode,
): BlueprintNode {
  const visited = visit(node);
  const mappedChildren = visited.children.map((c) => mapTree(c, visit));
  const changed = mappedChildren.some((c, i) => c !== visited.children[i]);
  return changed ? { ...visited, children: mappedChildren } : visited;
}

/** Recursively drop the node with the given id (root is protected). */
function removeById(
  node: BlueprintNode,
  targetId: string,
): BlueprintNode {
  const nextChildren = node.children
    .filter((c) => c._uid !== targetId)
    .map((c) => removeById(c, targetId));
  const changed =
    nextChildren.length !== node.children.length ||
    nextChildren.some((c, i) => c !== node.children[i]);
  return changed ? { ...node, children: nextChildren } : node;
}

export function builderReducer(
  state: BuilderState,
  action: BuilderAction,
): BuilderState {
  switch (action.type) {
    case 'select':
      return state.selectedId === action.id
        ? state
        : { ...state, selectedId: action.id };

    case 'hover':
      return state.hoveredId === action.id
        ? state
        : { ...state, hoveredId: action.id };

    case 'addNode': {
      const newNode = createNode(action.nodeType);
      // Root-drop path: an empty contract accepts any atom as its root.
      if (action.parentId === null) {
        if (state.contract.root !== null) return state;
        return {
          ...state,
          contract: { ...state.contract, root: newNode },
          selectedId: newNode._uid,
        };
      }
      // Child-drop path: walk the tree to the parent and append.
      if (state.contract.root === null) return state;
      const nextRoot = mapTree(state.contract.root, (n) =>
        n._uid === action.parentId
          ? { ...n, children: [...n.children, newNode] }
          : n,
      );
      return {
        ...state,
        contract: { ...state.contract, root: nextRoot },
        selectedId: newNode._uid,
      };
    }

    case 'updateProps': {
      if (state.contract.root === null) return state;
      const nextRoot = mapTree(state.contract.root, (n) =>
        n._uid === action.id
          ? { ...n, props: { ...n.props, ...action.patch } }
          : n,
      );
      return { ...state, contract: { ...state.contract, root: nextRoot } };
    }

    case 'setNodeId': {
      // Renames the PUBLIC `nodeId` (the export/override key), matching the
      // target by its internal `_uid`. Never touches `selectedId` — that
      // tracks `_uid`, which a nodeId rename leaves untouched. Empty is a
      // no-op (nodeId is mandatory in the Builder).
      if (state.contract.root === null) return state;
      if (!action.newId) return state;
      const nextRoot = mapTree(state.contract.root, (n) =>
        n._uid === action.id ? { ...n, nodeId: action.newId } : n,
      );
      return { ...state, contract: { ...state.contract, root: nextRoot } };
    }

    case 'setNodeType': {
      if (state.contract.root === null) return state;
      const next = action.newType.trim();
      if (!next) return state;
      const nextRoot = mapTree(state.contract.root, (n) =>
        n._uid === action.id ? { ...n, type: next } : n,
      );
      return { ...state, contract: { ...state.contract, root: nextRoot } };
    }

    case 'setLayoutHint': {
      if (state.contract.root === null) return state;
      const nextRoot = mapTree(state.contract.root, (n) => {
        if (n._uid !== action.id) return n;
        if (action.value === undefined) {
          const copy = { ...n };
          delete (copy as Record<string, unknown>).layoutHint;
          return copy;
        }
        return { ...n, layoutHint: action.value as BlueprintNode['layoutHint'] };
      });
      return { ...state, contract: { ...state.contract, root: nextRoot } };
    }

    case 'setNodeAxis': {
      if (state.contract.root === null) return state;
      const nextRoot = mapTree(state.contract.root, (n) => {
        if (n._uid !== action.id) return n;
        // `undefined` deletes the axis so the exported JSON stays
        // minimal — Blueprint treats absence as "use default".
        const copy: BlueprintNode = { ...n };
        if (action.value === undefined) {
          delete (copy as Record<string, unknown>)[action.axis];
        } else {
          (copy as Record<string, unknown>)[action.axis] = action.value;
        }
        return copy;
      });
      return { ...state, contract: { ...state.contract, root: nextRoot } };
    }

    case 'removeNode': {
      if (state.contract.root === null) return state;
      // Removing the root wipes the contract back to empty.
      if (state.contract.root._uid === action.id) {
        return {
          ...state,
          contract: { ...state.contract, root: null },
          selectedId: null,
        };
      }
      const nextRoot = removeById(state.contract.root, action.id);
      const nextSelected =
        state.selectedId === action.id ? null : state.selectedId;
      return {
        ...state,
        contract: { ...state.contract, root: nextRoot },
        selectedId: nextSelected,
      };
    }

    case 'moveNode': {
      const root = state.contract.root;
      if (root === null) return state;
      // The root itself can't be moved — its identity is the tree.
      if (root._uid === action.id) return state;
      // Locate the node to move; abort if not found.
      const moving = findNodeById(root, action.id);
      if (moving === null) return state;
      // Reject moves into the same subtree — that would either be a
      // no-op (same parent) or a cycle (dropping a parent into its
      // own descendant). We treat both as no-ops to keep the reducer
      // conservative; UX-level nudges (e.g. shake animation) are the
      // Canvas's job, not the state's.
      if (isDescendantOrSelf(moving, action.newParentId)) return state;
      // Dropping onto the reorder strip directly above the node itself
      // targets `insertBeforeId === id`. That's a no-op, NOT an
      // append-to-end — leave the tree untouched instead of yanking the
      // node to the bottom of its list.
      if (action.insertBeforeId === action.id) return state;
      // Detach from old parent, then insert under the new one, in a
      // single tree walk so intermediate states never appear.
      const detached = removeById(root, action.id);
      const nextRoot = mapTree(detached, (n) => {
        if (n._uid !== action.newParentId) return n;
        const before = action.insertBeforeId;
        if (before) {
          const idx = n.children.findIndex((c) => c._uid === before);
          if (idx >= 0) {
            const nextChildren = n.children.slice();
            nextChildren.splice(idx, 0, moving);
            return { ...n, children: nextChildren };
          }
        }
        return { ...n, children: [...n.children, moving] };
      });
      return {
        ...state,
        contract: { ...state.contract, root: nextRoot },
        selectedId: action.id,
      };
    }

    case 'replaceContract':
      return { ...state, contract: action.contract, selectedId: null };

    case 'setFileRef':
      return { ...state, fileRef: action.fileRef };

    case 'openFile':
      return {
        ...state,
        contract: action.contract,
        fileRef: action.fileRef,
        selectedId: null,
        hoveredId: null,
      };

    default:
      return state;
  }
}

/**
 * Read-side helper — locate a node by id anywhere in the tree.
 * Returns `null` if not found. Used by the Inspector to resolve the
 * selection into the actual node it should render.
 */
export function findNodeById(
  node: BlueprintNode | null,
  id: string | null,
): BlueprintNode | null {
  if (!node || !id) return null;
  if (node._uid === id) return node;
  for (const child of node.children) {
    const hit = findNodeById(child, id);
    if (hit) return hit;
  }
  return null;
}

/**
 * Walk the tree looking for the parent of the node with the given id.
 * Returns `null` when the id is the root itself or not found. Used by
 * the Inspector to know when to surface the grid-only `LayoutEditor`.
 */
export function findParentOf(
  root: BlueprintNode | null,
  id: string | null,
): BlueprintNode | null {
  if (!root || !id) return null;
  for (const child of root.children) {
    if (child._uid === id) return root;
    const hit = findParentOf(child, id);
    if (hit) return hit;
  }
  return null;
}

/** Count all nodes in the tree, including the root. Empty tree → 0. */
export function countNodes(node: BlueprintNode | null): number {
  if (!node) return 0;
  let n = 1;
  for (const c of node.children) n += countNodes(c);
  return n;
}

/**
 * True if `targetId` is the node itself or lives anywhere in its
 * subtree. Used by `moveNode` to refuse cyclic drops.
 */
export function isDescendantOrSelf(
  node: BlueprintNode,
  targetId: string,
): boolean {
  if (node._uid === targetId) return true;
  for (const child of node.children) {
    if (isDescendantOrSelf(child, targetId)) return true;
  }
  return false;
}
