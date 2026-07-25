/**
 * Zod-schema → PropField[] adapter for the schema-driven Inspector.
 *
 * Blueprint core exports one zod schema per atom (`ATOM_PROP_SCHEMAS`).
 * The Inspector needs a flat, UI-oriented representation of each
 * schema's top-level fields — name, kind, optional/required, and the
 * option list for enums. This adapter walks the schema once per
 * selection change and returns that flat list.
 *
 * Scope: only the SHALLOW top-level shape is introspected. Nested
 * `z.object(...)` fields fall back to the "json" kind (rendered as a
 * read-only JSON textarea). Discriminated unions, arrays of objects,
 * and records land here too — Phase 3d will grow the editor as those
 * shapes actually appear in real contracts.
 *
 * Zod v4 exposes schema internals via `._zod.def`. We treat that as
 * opaque (typed as `unknown` at the boundary and cast where needed) so
 * a zod version bump doesn't leak into the wider Builder codebase.
 */
import { ATOM_PROP_SCHEMAS, type AtomName } from '@dashforge/blueprint-core';

export type PropKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'responsive'
  | 'json';

export type PropField = {
  key: string;
  kind: PropKind;
  optional: boolean;
  /** For `kind === 'enum'`, the accepted option list (stringified for the <select>). */
  options?: string[];
  /**
   * For `kind === 'enum'`, the underlying primitive type of the enum
   * members. Native `z.enum(...)` and string-literal unions produce
   * `string`; number-literal unions (e.g. `heading.level`, `elevationToken`)
   * produce `number`. PropEditor coerces the <select>'s string value
   * back to this type before writing to the contract — otherwise the
   * validator sees `"2"` where it expects `2` and rejects the edit.
   */
  enumValueType?: 'string' | 'number';
  /**
   * For `kind === 'responsive'`, the primitive kind of each breakpoint
   * cell (e.g. `number` for `Grid.cols`, `string` for future
   * responsive enums). Rendered as a per-breakpoint input of that
   * kind.
   */
  responsiveKind?: 'number' | 'string';
  /** Human-readable hint for the input, when the schema exposes one. */
  description?: string;
};

const RESPONSIVE_KEYS = new Set(['base', 'sm', 'md', 'lg', 'xl']);

/**
 * Detect the `responsive(inner)` union shape — `z.union([inner,
 * z.object({ base?, sm?, md?, lg?, xl? }).strict()])`. Returns the
 * inner primitive kind (`number` or `string`) when the pattern matches;
 * `null` otherwise so callers fall through to the generic union path.
 */
function detectResponsive(options: unknown[]): 'number' | 'string' | null {
  if (options.length !== 2) return null;
  // Any order is acceptable — the object variant is the tell.
  for (let i = 0; i < 2; i++) {
    const objDef = defOf(options[i]);
    const otherDef = defOf(options[1 - i]);
    if (!objDef || !otherDef) continue;
    if (objDef.type !== 'object') continue;
    const shape = objDef.shape as Record<string, unknown> | undefined;
    if (!shape) continue;
    const shapeKeys = Object.keys(shape);
    if (shapeKeys.length !== RESPONSIVE_KEYS.size) continue;
    if (!shapeKeys.every((k) => RESPONSIVE_KEYS.has(k))) continue;
    // Object matches — the OTHER variant is the inner primitive.
    if (otherDef.type === 'number') return 'number';
    if (otherDef.type === 'string') return 'string';
  }
  return null;
}

/** Internal opaque handle for a zod schema. */
type UnknownSchema = { _zod?: { def?: Record<string, unknown> } };

function defOf(schema: unknown): Record<string, unknown> | null {
  const s = schema as UnknownSchema | null | undefined;
  return s?._zod?.def ?? null;
}

/**
 * Strip Optional / Default / Nullable wrappers and return `{ schema, optional }`.
 * `optional` is true if any level of the wrapper chain marks the field as
 * "may be absent" (either explicit optional or defaulted).
 */
function unwrap(schema: unknown): { inner: unknown; optional: boolean } {
  let cur = schema;
  let optional = false;
  // Bounded loop — a wrapper chain deeper than 8 levels is a bug elsewhere.
  for (let i = 0; i < 8; i++) {
    const def = defOf(cur);
    if (!def) return { inner: cur, optional };
    const type = def.type as string | undefined;
    if (type === 'optional' || type === 'default' || type === 'nullable') {
      optional = true;
      cur = def.innerType;
      continue;
    }
    return { inner: cur, optional };
  }
  return { inner: cur, optional };
}

function kindFor(schema: unknown): {
  kind: PropKind;
  options?: string[];
  enumValueType?: 'string' | 'number';
  responsiveKind?: 'number' | 'string';
} {
  const def = defOf(schema);
  if (!def) return { kind: 'json' };
  switch (def.type) {
    case 'string':
      return { kind: 'string' };
    case 'number':
      return { kind: 'number' };
    case 'boolean':
      return { kind: 'boolean' };
    case 'enum': {
      // `entries` is a record whose keys/values are the enum members.
      // Native `z.enum(...)` members are always strings.
      const entries = def.entries as Record<string, string | number> | undefined;
      const options = entries ? Object.values(entries).map(String) : [];
      return { kind: 'enum', options, enumValueType: 'string' };
    }
    case 'union': {
      // Unions cover four patterns worth surfacing:
      //   1. `responsive(inner)` = `union([inner, object({base…xl})])`
      //      → dedicated responsive editor (Single / per-breakpoint).
      //   2. `union([literal(1), literal(2), ...])` — synthetic enum
      //      (heading.level, calendar.weekStartDay, elevation).
      //   3. `union([string, number])` (badge.content) — text input
      //      accepts both when the user types, so `string` is enough.
      // Anything else drops to `json` so power users can hand-edit.
      const options = def.options as unknown[] | undefined;
      if (!options || options.length === 0) return { kind: 'json' };
      // Pattern 1: responsive envelope.
      const responsiveInner = detectResponsive(options);
      if (responsiveInner) {
        return { kind: 'responsive', responsiveKind: responsiveInner };
      }
      // Pattern 2: all literals → synthetic enum.
      const literals = options
        .map((o) => {
          const inner = defOf(o);
          return inner?.type === 'literal'
            ? (inner.values as unknown[] | undefined)?.[0] ??
                (inner as { value?: unknown }).value
            : undefined;
        })
        .filter((v): v is string | number => v !== undefined);
      if (literals.length === options.length) {
        // Preserve the underlying primitive type — number literals
        // (heading.level 1-6, elevation 0-5) must round-trip as
        // numbers, otherwise the strict-mode validator rejects them.
        const allNumbers = literals.every((v) => typeof v === 'number');
        return {
          kind: 'enum',
          options: literals.map(String),
          enumValueType: allNumbers ? 'number' : 'string',
        };
      }
      // Pattern 3: fall back to the primitive kind of the first
      // variant that we can recognise.
      for (const opt of options) {
        const t = defOf(opt)?.type;
        if (t === 'number') return { kind: 'number' };
        if (t === 'string') return { kind: 'string' };
        if (t === 'boolean') return { kind: 'boolean' };
      }
      return { kind: 'json' };
    }
    default:
      return { kind: 'json' };
  }
}

/**
 * Introspect an atom's zod schema and return its top-level fields.
 * Returns `null` for atoms whose schema is not a `z.object(...)`.
 */
export function fieldsForAtom(type: string): PropField[] | null {
  if (!(type in ATOM_PROP_SCHEMAS)) return null;
  const schema = (ATOM_PROP_SCHEMAS as Record<string, unknown>)[type];
  const def = defOf(schema);
  if (!def || def.type !== 'object') return null;
  const shape = def.shape as Record<string, unknown> | undefined;
  if (!shape) return null;
  const out: PropField[] = [];
  for (const [key, field] of Object.entries(shape)) {
    const { inner, optional } = unwrap(field);
    const { kind, options, enumValueType, responsiveKind } = kindFor(inner);
    const desc = (defOf(inner)?.description as string | undefined) ?? undefined;
    out.push({
      key,
      kind,
      optional,
      options,
      enumValueType,
      responsiveKind,
      description: desc,
    });
  }
  return out;
}

/** Convenience narrowing helper — `type` is a catalog atom name. */
export function isKnownAtom(type: string): type is AtomName {
  return type in ATOM_PROP_SCHEMAS;
}
