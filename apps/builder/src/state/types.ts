/**
 * Builder state — types.
 *
 * A `BlueprintNode` is the runtime shape the Builder produces and the
 * Blueprint runtime consumes (see BUILDER-V2-DESIGN.md §14: zero
 * coupling beyond this JSON shape). The Builder never persists React
 * refs, DOM ids, or UI selection state — only the node tree itself
 * (`Contract`) ends up in the exported JSON.
 *
 * `BuilderState` is the ephemeral editor state that wraps the contract:
 * currently just `selectedId`, but designed to grow with undo history,
 * clipboard, hover state, etc. Kept flat here so the reducer stays
 * predictable and immutable-update friendly.
 */

/** Atom type discriminator — one of the 36 catalog entries. */
export type AtomType = string;

/**
 * A single node in the contract tree.
 *
 * Envelope shape matches Blueprint core's `nodeSchema` (see
 * blueprint-core/schema.ts). `id` is Builder-generated (nano-like) and
 * stable across edits — used for selection, drop targets, and
 * inspector wiring. It also identifies the node in the exported JSON
 * so `<DashBlueprint forms>`, `<DashBlueprint slots>` etc. can address
 * it by name.
 *
 * `props` is opaque here — per-atom shapes live in Blueprint core's
 * `ATOM_PROP_SCHEMAS`; the schema-driven Inspector reads those to
 * generate editors.
 *
 * The three optional state axes (Decision #17) + `slots` (Decision #16)
 * are surfaced here as first-class envelope fields so the Inspector
 * can edit them independently of the atom's props map.
 */
export type BlueprintNode = {
  id: string;
  type: AtomType;
  props: Record<string, unknown>;
  children: BlueprintNode[];
  /**
   * Slot overrides — atom-defined named slots mapped to override
   * nodes. `slots={}` is the canonical escape hatch (Decision #16).
   * Opaque here; the Inspector defers to a JSON textarea until the
   * builder gains a slot picker (Phase 3d).
   */
  slots?: Record<string, unknown>;
  /**
   * Static (`boolean`) or dynamic (`VisibilityRule`) presence
   * declaration. `false` hides the node; a rule predicate is evaluated
   * against `$form.*` state at render time. Absence means "always
   * visible" (Blueprint's default).
   */
  visibility?: boolean | Record<string, unknown>;
  /**
   * Static structural disable. Only `true` means "always disabled" —
   * for dynamic disable, wrap the atom in a `customNode`.
   */
  disabled?: boolean;
  /**
   * RBAC requirement. `resource` + `action` are opaque strings the
   * consumer resolves via `@dashforge/rbac`; `onUnauthorized` decides
   * the visual outcome when the check fails.
   */
  access?: {
    resource: string;
    action: string;
    onUnauthorized?: 'hide' | 'disable' | 'readonly';
  };
  /**
   * Layout hint consumed by the parent container. Only `grid` reads
   * `size` today (Bootstrap-style 12-col span, optionally responsive).
   * Other containers ignore it silently, so moving a node around the
   * tree doesn't destroy the hint.
   */
  layoutHint?: {
    size?:
      | number
      | {
          base?: number;
          sm?: number;
          md?: number;
          lg?: number;
          xl?: number;
        };
  };
};

/**
 * The top-level contract shape. `version` mirrors the Blueprint
 * versioning story (Builder v2.0.0 may target v1.0.0 contracts) and is
 * an authoring hint — real compatibility is enforced by Blueprint's
 * schema validator at load time.
 *
 * `root` is nullable: an empty canvas has no root, and the first drop
 * decides what the root will be (form, page, dashboard, a single text
 * atom — anything). The Builder never forces a wrapper.
 */
export type Contract = {
  version: string;
  root: BlueprintNode | null;
};

/**
 * Ephemeral editor state. Everything here is Builder-local; only
 * `contract` survives export.
 */
export type BuilderState = {
  contract: Contract;
  selectedId: string | null;
  /**
   * Transient outline target — the palette sets this while the user
   * scrolls a Navigate row, so the Canvas can flash a ghost outline
   * over the node without touching the real selection. Always reset
   * to `null` when the palette closes.
   */
  hoveredId: string | null;
  /**
   * Workspace / file the current buffer belongs to. `null` while the
   * user is editing an untitled draft that hasn't been saved yet.
   */
  fileRef: FileRef | null;
};

/** Pointer to a saved contract inside a workspace. */
export type FileRef = {
  workspaceId: string;
  fileId: string;
  name: string;
};
