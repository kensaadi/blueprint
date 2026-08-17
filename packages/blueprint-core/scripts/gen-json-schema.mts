/**
 * Generate the canonical, language-agnostic JSON Schema for the Blueprint
 * contract — the frozen v1 spec every backend SDK (Node / Java / Go / …)
 * validates against.
 *
 * The zod schemas in `src/` are the source of truth in TypeScript; this
 * script projects them to standard JSON Schema (2020-12) so non-TS
 * consumers get the SAME structural contract without re-porting zod.
 *
 * Shape of the emitted document:
 *   - `$defs.document`  — the envelope: version / lib / root / metadata.
 *   - `$defs.node`      — the recursive node (nodeId / type / props / …).
 *     `type` is constrained to the CLOSED atom catalog; a per-atom
 *     `allOf` if/then binds `props` to the matching `$defs.props_<atom>`,
 *     so a single standard JSON-Schema validator does full structural
 *     validation in one pass (mirroring core's two-pass validate()).
 *   - `$defs.props_<atom>` — one entry per atom, its `props` schema.
 *   - `$defs.visibilityRule` — the recursive visibility predicate DSL.
 *
 * DO NOT hand-edit `spec/contract-v1.schema.json`: run `pnpm gen:spec`.
 * `spec-drift.test.ts` fails CI if the committed file is stale.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from '../src/zod-jitless';
import { ATOM_PROP_SCHEMAS, ATOM_NAMES, ATOMS_REQUIRING_ID } from '../src/atoms';
import { nodeSchema, documentSchema } from '../src/schema';

type Json = Record<string, unknown>;

/** Deep-walk a JSON value, remapping every `$ref` string via `map`. */
function rebaseRefs<T>(value: T, map: Record<string, string>): T {
  if (Array.isArray(value)) {
    return value.map((v) => rebaseRefs(v, map)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Json = {};
    for (const [k, v] of Object.entries(value as Json)) {
      if (k === '$ref' && typeof v === 'string' && v in map) {
        out[k] = map[v];
      } else {
        out[k] = rebaseRefs(v, map);
      }
    }
    return out as unknown as T;
  }
  return value;
}

/** Strip the per-schema `$schema` header (we set one at the top level only). */
function stripHeader(js: Json): Json {
  const { $schema: _drop, ...rest } = js;
  return rest;
}

// ── Node envelope ──────────────────────────────────────────────────
// zod emits the recursion as `$ref: "#"` (self) + `$defs.__schema0`
// (the visibility predicate). Rebase both to stable, document-level names.
const REF_MAP = {
  '#': '#/$defs/node',
  '#/$defs/__schema0': '#/$defs/visibilityRule',
} as const;

const nodeRaw = z.toJSONSchema(nodeSchema as unknown as z.ZodType) as Json;
const nodeDefs = (nodeRaw.$defs ?? {}) as Json;
const visibilityRule = rebaseRefs(nodeDefs.__schema0 as Json, REF_MAP);

const node = rebaseRefs(stripHeader(nodeRaw), REF_MAP);
delete (node as Json).$defs;

// Close the catalog: `type` is one of the known atoms, nothing else.
(node.properties as Json).type = {
  type: 'string',
  enum: [...ATOM_NAMES],
  description:
    'The atom kind. Closed catalog — the runtime renders exactly these; ' +
    'domain rendering is a mount-time slot override keyed by nodeId, not a new type.',
};

// Per-atom props dispatch: `if type === <atom> then props matches its schema`.
const propsDefs: Json = {};
const allOf: Json[] = [];
for (const name of ATOM_NAMES) {
  propsDefs[`props_${name}`] = stripHeader(
    z.toJSONSchema(ATOM_PROP_SCHEMAS[name] as unknown as z.ZodType) as Json,
  );
  allOf.push({
    if: { properties: { type: { const: name } }, required: ['type'] },
    then: { properties: { props: { $ref: `#/$defs/props_${name}` } } },
  });
}
// Atoms that require a public nodeId (e.g. `form`, looked up by the runtime).
for (const name of ATOMS_REQUIRING_ID) {
  allOf.push({
    if: { properties: { type: { const: name } }, required: ['type'] },
    then: { required: ['nodeId'] },
  });
}
node.allOf = allOf;

// ── Document envelope ──────────────────────────────────────────────
// Derive version / lib / metadata faithfully from documentSchema, then
// point `root` at the shared node def instead of re-inlining the tree.
const documentDef = stripHeader(
  z.toJSONSchema(documentSchema as unknown as z.ZodType) as Json,
);
delete (documentDef as Json).$defs;
(documentDef.properties as Json).root = { $ref: '#/$defs/node' };

// ── Assemble ───────────────────────────────────────────────────────
export const contractJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://blueprint.dashforge-ui.com/spec/contract-v1.schema.json',
  title: 'Blueprint Contract v1',
  description:
    'Canonical, language-agnostic JSON Schema for a Blueprint contract ' +
    '(version 1.0). Generated from @dashforge/blueprint-core by ' +
    'scripts/gen-json-schema.mts — do not hand-edit; run `pnpm gen:spec`.',
  $ref: '#/$defs/document',
  $defs: {
    document: documentDef,
    node,
    visibilityRule,
    ...propsDefs,
  },
};

// ── Emit (when run directly) ───────────────────────────────────────
const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, '..', 'spec', 'contract-v1.schema.json');

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(outPath, JSON.stringify(contractJsonSchema, null, 2) + '\n');
  const atoms = ATOM_NAMES.length;
  // eslint-disable-next-line no-console
  console.log(`✓ wrote spec/contract-v1.schema.json (${atoms} atoms)`);
}
