/**
 * @dashforge/blueprint-core (sandbox preview)
 *
 * Core types for the Blueprint contract. No React, no DS dependency.
 * Will be extracted to `@dashforge/blueprint-core` when promoted to the monorepo.
 */

import type { VisibilityRule } from './visibility';
import type { AccessRule } from './access';
import type { LayoutHint } from './layout';

export type LibName = 'tw' | 'mui';

export type BlueprintDocument = {
  version: '1.0';
  /** Optional preferred renderer flavor; the `lib` prop on `<DashBlueprint>` wins over this. */
  lib?: LibName;
  root: BlueprintNode;
  metadata?: Record<string, unknown>;
};

export type BlueprintNode = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  children?: BlueprintNode[];
  slots?: Record<string, BlueprintNode | BlueprintNode[]>;
  /**
   * Hybrid visibility — `boolean` (STATIC structural) or `VisibilityRule`
   * (DYNAMIC predicate). `false` always hides; `true` or absent always
   * shows (subject to RBAC). See `visibility.ts`.
   */
  visibility?: boolean | VisibilityRule;
  /**
   * Static structural disable. `true` always disables the node (subject
   * to OR-composition with RBAC-resolved access). For DYNAMIC disable,
   * use a customNode that owns the toggle logic (Decision #15).
   */
  disabled?: boolean;
  access?: AccessRule;
  /**
   * Hint to the parent container about how to size / place this node.
   * Only interpreted by containers that opt in (currently `grid`).
   * Every other container silently ignores it, so adding a hint isn't
   * destructive if you rearrange the tree.
   */
  layoutHint?: LayoutHint;
};

/**
 * Form configuration passed via `<DashBlueprint forms={{ "form-id": ... }}>`.
 *
 * `schema`: zod schema, auto-wrapped in zodResolver by the flavor pack.
 * `resolver`: pre-built RHF resolver (escape hatch — use when you need
 * a non-zod validator like valibot or a custom one).
 *
 * Pass at most one of `schema` / `resolver`. If both are set, `resolver`
 * wins (more explicit).
 */
/**
 * Lifecycle API passed to `onMount`. Minimal shape — getter for current
 * values, setter for one-shot reset (used to load drafts at mount).
 */
export type FormMountApi = {
  /** Read current form values. */
  getValues: () => Record<string, unknown>;
  /** Reset the form to the given values — useful to hydrate from localStorage / API. */
  reset: (values: Record<string, unknown>) => void;
  /**
   * Set a single field value without resetting the rest of the form.
   * Light-weight version of `reset` for targeted mutations (e.g. after a
   * server-side lookup populates one field).
   *
   * Closes Formily-gap audit item #8: programmatic per-field setting
   * shouldn't require the heavy `reset(allValues)` call.
   */
  setValue: (name: string, value: unknown) => void;
};

export type FormConfig = {
  // The flavor packs cast this to `ZodSchema` and wrap with zodResolver.
  // Typed as `unknown` here so blueprint-core stays free of a hard zod
  // peer dep at the type level (zod is a runtime dep of the flavor packs
  // and the validator, not of the core types).
  schema?: unknown;
  resolver?: unknown;
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
  defaultValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onError?: (err: unknown) => void;

  /**
   * Fires ONCE when the form is mounted and the bridge is ready.
   * Use to log analytics, hydrate from a saved draft, set focus.
   *
   * Example — load a localStorage draft:
   *   onMount: ({ reset }) => {
   *     const draft = localStorage.getItem('kyc-draft');
   *     if (draft) reset(JSON.parse(draft));
   *   }
   */
  onMount?: (api: FormMountApi) => void;

  /**
   * Fires on every value change. `field` is the name of the changed
   * field (or `undefined` when RHF reports a multi-field update such as
   * a programmatic `reset`).
   *
   * Example — debounced autosave to localStorage:
   *   onValuesChange: debounce((values, field) => {
   *     localStorage.setItem('kyc-draft', JSON.stringify(values));
   *     analytics.track('form.field-change', { field });
   *   }, 1500),
   */
  onValuesChange?: (
    values: Record<string, unknown>,
    field: string | undefined,
  ) => void;
};

/** Responsive shape accepted by token props. */
export type Responsive<T> = T | Partial<Record<'base' | 'sm' | 'md' | 'lg' | 'xl', T>>;

export type SpacingToken = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type RoundedToken = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ElevationToken = 0 | 1 | 2 | 3 | 4 | 5;
