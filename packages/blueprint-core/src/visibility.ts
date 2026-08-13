/**
 * Visibility predicate DSL — field-first shape.
 *
 *   { field: "$form.country", eq: "IT" }
 *   { and: [...] }
 *   { not: { ... } }
 *   { rule: "showForBetaUsers" }     // escape hatch — resolved via DashBlueprint.rules
 *
 * Paths use a `$prefix.path` syntax so we can extend later:
 *   $form.X        → form-state value (via useDashFieldMeta(X))
 *   $session.X     → reserved (V1.x)
 *   $env.X         → reserved (V1.x)
 *
 * For V1 only `$form.` is wired. Unknown prefixes resolve to `undefined`
 * (and predicates that compare against them are false).
 */

import { z } from './zod-jitless';

/** Re-usable leaf-predicate scaffolding. */
const leafField = { field: z.string().regex(/^\$[a-zA-Z]+\..+/, 'must be "$prefix.path"') } as const;

const leafSchemas = [
  z.object({ ...leafField, eq:     z.unknown() }).strict(),
  z.object({ ...leafField, neq:    z.unknown() }).strict(),
  z.object({ ...leafField, in:     z.array(z.unknown()) }).strict(),
  z.object({ ...leafField, nin:    z.array(z.unknown()) }).strict(),
  z.object({ ...leafField, exists: z.boolean() }).strict(),
  z.object({ ...leafField, gt:     z.union([z.number(), z.string()]) }).strict(),
  z.object({ ...leafField, gte:    z.union([z.number(), z.string()]) }).strict(),
  z.object({ ...leafField, lt:     z.union([z.number(), z.string()]) }).strict(),
  z.object({ ...leafField, lte:    z.union([z.number(), z.string()]) }).strict(),
];

const ruleRefSchema = z.object({ rule: z.string() }).strict();

export const visibilityRuleSchema: z.ZodType<VisibilityRule> = z.lazy(() =>
  z.union([
    ...leafSchemas,
    ruleRefSchema,
    z.object({ and: z.array(visibilityRuleSchema).min(1) }).strict(),
    z.object({ or:  z.array(visibilityRuleSchema).min(1) }).strict(),
    z.object({ not: visibilityRuleSchema }).strict(),
  ]),
);

export type VisibilityRule =
  | { field: string; eq:     unknown }
  | { field: string; neq:    unknown }
  | { field: string; in:     unknown[] }
  | { field: string; nin:    unknown[] }
  | { field: string; exists: boolean }
  | { field: string; gt:     number | string }
  | { field: string; gte:    number | string }
  | { field: string; lt:     number | string }
  | { field: string; lte:    number | string }
  | { rule: string }
  | { and: VisibilityRule[] }
  | { or:  VisibilityRule[] }
  | { not: VisibilityRule };

/**
 * Hybrid visibility — `boolean | VisibilityRule`.
 *
 * Two semantics:
 *   - `boolean` — STATIC structural decision. `false` = always hidden,
 *     `true` = always visible (the default if absent).
 *   - `VisibilityRule` — DYNAMIC predicate evaluated against the form
 *     state. The existing DSL.
 *
 * Composition with `access` (RBAC): contract can only RESTRICT. If the
 * contract says `false`, RBAC cannot un-hide it.
 */
export const visibilityValueSchema = z.union([z.boolean(), visibilityRuleSchema]);

export type VisibilityValue = boolean | VisibilityRule;

/**
 * Find all `$form.X` field references inside a rule — used by the
 * validator's cycle-detection pass.
 */
export function collectFieldRefs(rule: VisibilityRule, into: Set<string> = new Set()): Set<string> {
  if ('and' in rule) rule.and.forEach((r) => collectFieldRefs(r, into));
  else if ('or' in rule) rule.or.forEach((r) => collectFieldRefs(r, into));
  else if ('not' in rule) collectFieldRefs(rule.not, into);
  else if ('field' in rule && rule.field.startsWith('$form.')) {
    into.add(rule.field.slice('$form.'.length));
  }
  // 'rule' refs (escape hatch) are opaque — can't introspect, treat as no-deps.
  return into;
}
