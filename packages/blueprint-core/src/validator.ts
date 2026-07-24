/**
 * Contract validator.
 *
 * Two-pass strategy:
 *
 *   1. Structural pass — `documentSchema.safeParse(doc)`. Catches version
 *      mismatch, malformed nodes, invalid visibility/access shapes.
 *   2. Atom prop pass — recursive walk; for each node whose `type` is a
 *      catalog atom, run its prop schema against `node.props`. Unknown
 *      types are either skipped (lenient, default) or flagged (strict).
 *
 * Errors carry RFC-6901 JSON pointers so the Builder / devtools can
 * highlight the offending node deterministically.
 */

import type { ZodError } from 'zod';
import type { BlueprintDocument, BlueprintNode } from './types';
import { documentSchema } from './schema';
import { ATOM_PROP_SCHEMAS, ATOMS_REQUIRING_ID, isAtomName } from './atoms';
import { collectFieldRefs, type VisibilityRule } from './visibility';
import type {
  ValidationError,
  ValidationOptions,
  ValidationResult,
} from './errors';

/** Convert a zod issue path (segments) to a JSON pointer. */
function toPointer(segments: ReadonlyArray<PropertyKey>, prefix = ''): string {
  const escaped = segments.map((s) =>
    String(s).replace(/~/g, '~0').replace(/\//g, '~1'),
  );
  return prefix + (escaped.length ? '/' + escaped.join('/') : '');
}

/** Stringify a received value to a short, readable label. */
function summarizeValue(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'string') return `"${v.length > 32 ? `${v.slice(0, 29)}…` : v}"`;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `array[${v.length}]`;
  if (typeof v === 'object') {
    const keys = Object.keys(v as object);
    return `object{${keys.length > 0 ? keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', …' : '') : ''}}`;
  }
  return typeof v;
}

function fromZodError(err: ZodError, prefix = '', atomType?: string, atomId?: string): ValidationError[] {
  return err.issues.map((issue) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const i = issue as any;
    const enriched: ValidationError = {
      path: toPointer(issue.path, prefix),
      message: issue.message,
      severity: 'error' as const,
      code: issue.code,
    };
    // zod issue may carry `expected`/`received` for invalid_type, or
    // `options` for invalid_enum, etc. We pull whatever is there.
    if (typeof i.expected === 'string') enriched.expected = i.expected;
    if (i.received !== undefined) {
      enriched.received = typeof i.received === 'string' ? i.received : String(i.received);
    }
    if (Array.isArray(i.options)) {
      // enum-style: expected becomes the comma-list of valid options
      enriched.expected = `one of [${i.options.map((o: unknown) => JSON.stringify(o)).join(', ')}]`;
    }
    if (i.input !== undefined) {
      enriched.receivedValue = i.input;
      if (!enriched.received) enriched.received = summarizeValue(i.input);
    }
    if (atomType) enriched.atomType = atomType;
    if (atomId) enriched.atomId = atomId;
    return enriched;
  });
}

function walkAtoms(
  node: BlueprintNode,
  prefix: string,
  errors: ValidationError[],
  warnings: ValidationError[],
  knownExternalTypes: ReadonlySet<string>,
  mode: 'strict' | 'lenient',
): void {
  // Form / other atoms that need a top-level `id`
  if (isAtomName(node.type) && ATOMS_REQUIRING_ID.has(node.type) && !node.id) {
    errors.push({
      path: `${prefix}/id`,
      message: `${node.type} node requires an id (used to find its config in the \`forms\` prop)`,
      severity: 'error',
      code: 'MISSING_ID',
      atomType: node.type,
    });
  }

  if (isAtomName(node.type)) {
    const schema = ATOM_PROP_SCHEMAS[node.type];
    const result = schema.safeParse(node.props ?? {});
    if (!result.success) {
      errors.push(...fromZodError(result.error, `${prefix}/props`, node.type, node.id));
    }
  } else if (!knownExternalTypes.has(node.type)) {
    const diagnostic: ValidationError = {
      path: `${prefix}/type`,
      message: `Unknown node type "${node.type}" — add it to \`customNodes\`, override via slot prop, or correct the contract.`,
      severity: mode === 'strict' ? 'error' : 'warning',
      code: 'UNKNOWN_TYPE',
      atomType: node.type,
      atomId: node.id,
      received: node.type,
    };
    (diagnostic.severity === 'error' ? errors : warnings).push(diagnostic);
  }

  node.children?.forEach((child, i) => {
    walkAtoms(child, `${prefix}/children/${i}`, errors, warnings, knownExternalTypes, mode);
  });
}

/**
 * Collect `{ nodeId, fieldName, dependsOn[] }` triples by walking the
 * tree. Only nodes with a non-boolean `visibility` rule + an `id` are
 * tracked (cycles require an id to be referenced).
 *
 * For form-field atoms (`field`, `select`, `date`, ...) the "field name"
 * is `props.name`, NOT `node.id` — that's what `$form.X` resolves against.
 */
type VisibilityNode = {
  /** id used in diagnostics — node.id if set, else props.name, else `<anonymous>`. */
  label: string;
  /** The form-field name this node represents (for `$form.X` resolution). */
  fieldName: string | undefined;
  /** Form-field names this node's visibility predicate depends on. */
  dependsOn: string[];
  path: string;
};

function collectVisibilityGraph(
  node: BlueprintNode,
  prefix: string,
  out: VisibilityNode[],
): void {
  if (node.visibility && typeof node.visibility !== 'boolean') {
    const fieldName = typeof node.props?.name === 'string' ? node.props.name : undefined;
    const label = node.id ?? fieldName ?? '<anonymous>';
    const deps = Array.from(collectFieldRefs(node.visibility as VisibilityRule));
    out.push({ label, fieldName, dependsOn: deps, path: `${prefix}/visibility` });
  }
  node.children?.forEach((child, i) =>
    collectVisibilityGraph(child, `${prefix}/children/${i}`, out),
  );
}

/**
 * Detect circular dependencies in `visibility` predicates. A cycle exists
 * when field A's rule references B, B's rule references A (directly or
 * transitively).
 *
 * Returns one diagnostic per cycle (deduped by path so the same cycle
 * detected from multiple entry points reports once). Severity follows the
 * validation mode: `error` in strict, `warning` in lenient.
 */
function detectVisibilityCycles(
  graph: VisibilityNode[],
  mode: 'strict' | 'lenient',
): ValidationError[] {
  // Build adjacency: form-field name → list of form-field names it depends on.
  const adj = new Map<string, { deps: string[]; entry: VisibilityNode }>();
  for (const n of graph) {
    if (n.fieldName) adj.set(n.fieldName, { deps: n.dependsOn, entry: n });
  }

  const issues: ValidationError[] = [];
  const seen = new Set<string>();

  function dfs(start: string, stack: string[], visited: Set<string>): void {
    visited.add(start);
    stack.push(start);
    const node = adj.get(start);
    if (!node) {
      stack.pop();
      visited.delete(start);
      return;
    }
    for (const dep of node.deps) {
      if (stack.includes(dep)) {
        // Cycle found
        const ringStart = stack.indexOf(dep);
        const ring = [...stack.slice(ringStart), dep];
        const cycleKey = [...ring].sort().join(' → ');
        if (seen.has(cycleKey)) continue;
        seen.add(cycleKey);
        issues.push({
          path: node.entry.path,
          message: `Cyclic visibility dependency: ${ring.join(' → ')}. Field A's rule references B and B's rule references A (directly or transitively) — the predicates can never stabilize.`,
          severity: mode === 'strict' ? 'error' : 'warning',
          code: 'CYCLIC_VISIBILITY',
        });
      } else if (!visited.has(dep)) {
        dfs(dep, stack, visited);
      }
    }
    stack.pop();
    visited.delete(start);
  }

  for (const fieldName of adj.keys()) {
    dfs(fieldName, [], new Set());
  }

  return issues;
}

export function validate(
  doc: unknown,
  opts: ValidationOptions = {},
): ValidationResult<BlueprintDocument> {
  const mode = opts.mode ?? 'lenient';
  const knownExternalTypes = new Set(opts.knownExternalTypes ?? []);
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Pass 1 — structural
  const structural = documentSchema.safeParse(doc);
  if (!structural.success) {
    errors.push(...fromZodError(structural.error));
    return { ok: false, errors, warnings };
  }

  const data = structural.data as BlueprintDocument;

  // Pass 2 — atom-specific
  walkAtoms(data.root, '/root', errors, warnings, knownExternalTypes, mode);

  // Pass 3 — cyclic visibility dependency detection
  const graph: VisibilityNode[] = [];
  collectVisibilityGraph(data.root, '/root', graph);
  const cycleIssues = detectVisibilityCycles(graph, mode);
  for (const issue of cycleIssues) {
    if (issue.severity === 'error') errors.push(issue);
    else warnings.push(issue);
  }

  if (errors.length) {
    return { ok: false, errors, warnings };
  }
  return { ok: true, data, warnings };
}
