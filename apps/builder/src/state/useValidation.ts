/**
 * useValidation — runs Blueprint core's validator against the current
 * contract every time it changes.
 *
 * The validator expects a full `BlueprintDocument` with a non-null
 * root. When the contract is empty we short-circuit and report a
 * dedicated `empty` state so the header's StatusChip doesn't yell
 * "invalid" on a blank canvas.
 *
 * Issues carry an `atomId` (envelope `node.id`) whenever the validator
 * can resolve it. We build a per-node index (`byId`) so the Inspector
 * can render only the issues attached to the currently-selected node.
 *
 * The whole thing is memoised on `contract` — re-runs only when the
 * tree actually changes, not on selection or hover.
 */
import { useMemo } from 'react';
import { validate } from '@dashforge/blueprint-core';
import type { ValidationError } from '@dashforge/blueprint-core';
import type { BlueprintNode, BlueprintDocument } from '@dashforge/blueprint-core';
import { useBuilderState } from './BuilderStateContext';
import { stripUid } from './exportContract';

/**
 * Builder-only lint: an empty container renders as zero-height at
 * runtime (the "Drop atoms here" placeholder is Canvas chrome only).
 * Legitimate when slots inject content, so it's a warning not an error.
 * Kept out of the core validator to avoid changing contract truth.
 */
const CONTAINER_TYPES: ReadonlySet<string> = new Set([
  'form', 'stack', 'section', 'card', 'container', 'grid', 'box',
  'tabs', 'accordion',
]);

function collectEmptyContainerWarnings(
  node: BlueprintNode,
  path: string,
): ValidationError[] {
  const out: ValidationError[] = [];
  const walk = (n: BlueprintNode, p: string) => {
    if (CONTAINER_TYPES.has(n.type) && (n.children?.length ?? 0) === 0) {
      out.push({
        path: p,
        severity: 'warning',
        code: 'BUILDER_EMPTY_CONTAINER',
        message: `Empty ${n.type} — will render as 0px at runtime unless content is injected via slots.`,
        atomType: n.type,
        atomId: n.nodeId,
      });
    }
    n.children?.forEach((c, i) => walk(c, `${p}/children/${i}`));
  };
  walk(node, path);
  return out;
}

export type ValidationSummary =
  | { kind: 'empty'; errors: []; warnings: []; byId: Map<string, ValidationError[]> }
  | { kind: 'valid'; errors: []; warnings: ValidationError[]; byId: Map<string, ValidationError[]> }
  | {
      kind: 'issues';
      count: number;
      errors: ValidationError[];
      warnings: ValidationError[];
      byId: Map<string, ValidationError[]>;
    };

function indexById(all: ValidationError[]): Map<string, ValidationError[]> {
  const m = new Map<string, ValidationError[]>();
  for (const issue of all) {
    const id = issue.atomId;
    if (!id) continue;
    const bucket = m.get(id);
    if (bucket) bucket.push(issue);
    else m.set(id, [issue]);
  }
  return m;
}

export function useValidation(): ValidationSummary {
  const { contract } = useBuilderState();
  return useMemo<ValidationSummary>(() => {
    if (contract.root === null) {
      return {
        kind: 'empty',
        errors: [],
        warnings: [],
        byId: new Map(),
      };
    }
    // The Builder's editing `BlueprintNode` (state/types) is a looser shape
    // than core's; cast at this boundary — the runtime validator still checks
    // the actual structure.
    // Strip the Builder-only `_uid` before validating — core's `.strict()`
    // schema rejects it as an unknown key (it's never in the contract).
    const result = validate(
      stripUid(contract) as unknown as BlueprintDocument,
      { mode: 'strict' },
    );
    const emptyWarnings = collectEmptyContainerWarnings(
      contract.root as unknown as BlueprintNode,
      '/root',
    );
    if (result.ok) {
      const warnings = [...result.warnings, ...emptyWarnings];
      return {
        kind: 'valid',
        errors: [],
        warnings,
        byId: indexById(warnings),
      };
    }
    const warnings = [...result.warnings, ...emptyWarnings];
    const all = [...result.errors, ...warnings];
    return {
      kind: 'issues',
      count: result.errors.length,
      errors: result.errors,
      warnings,
      byId: indexById(all),
    };
  }, [contract]);
}
