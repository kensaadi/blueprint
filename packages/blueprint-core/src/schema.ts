/**
 * Document-level zod schema. Used by the validator for structural checks
 * (version, lib, recursive node shape, visibility/access). Per-atom prop
 * schemas (from `./atoms.ts`) are applied in a separate pass.
 */

import { z } from './zod-jitless';
import { visibilityValueSchema } from './visibility';
import { accessRuleSchema } from './access';
import { layoutHintSchema } from './layout';

const SUPPORTED_VERSIONS = ['1.0'] as const;

const versionSchema = z.enum(SUPPORTED_VERSIONS);
const libSchema = z.enum(['tw', 'mui']);

export const nodeSchema: z.ZodType<unknown> = z.lazy(() => z.object({
  // Public, human-authored addressing key: the handle a consumer uses to
  // slot-override this node (`<DashBlueprint slots={{ [nodeId]: … }}>`) or
  // to find a form's config (`forms[nodeId]`). Optional in the schema
  // (bare hand-authored contracts are valid); the Builder always generates
  // one. Must be unique across the contract when present.
  nodeId: z.string().min(1).optional(),
  type: z.string().min(1, 'node.type must be a non-empty string'),
  props: z.record(z.string(), z.unknown()).optional(),
  children: z.array(nodeSchema).optional(),
  slots: z.record(z.string(), z.union([nodeSchema, z.array(nodeSchema)])).optional(),
  /**
   * Hybrid: `boolean` (static structural) | `VisibilityRule` (dynamic
   * predicate). See blueprint-core/visibility.ts.
   */
  visibility: visibilityValueSchema.optional(),
  /** Static structural disable. `true` = always disabled. */
  disabled: z.boolean().optional(),
  access: accessRuleSchema.optional(),
  /**
   * Hint to the parent container (currently: `grid` reads `size`).
   * Silently ignored by containers that don't consume it, so adding
   * a hint on a child of `stack` / `card` / etc. is a no-op instead
   * of an error.
   */
  layoutHint: layoutHintSchema.optional(),
}).strict());

export const documentSchema = z.object({
  version: versionSchema,
  lib: libSchema.optional(),
  root: nodeSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export { SUPPORTED_VERSIONS };
