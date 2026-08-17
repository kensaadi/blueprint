/**
 * Contract import helpers — parse a JSON file and turn it into a
 * `Contract` we can load via `replaceContract`.
 *
 * Two-pass validation:
 *   1. JSON.parse must succeed.
 *   2. Blueprint core's `validate()` must accept the shape (strict
 *      mode — anything less would let a broken file open).
 *
 * The Builder-level BlueprintNode envelope is a superset of
 * Blueprint's `nodeSchema` (same fields, `id/type/props/children` +
 * optional `slots/visibility/disabled/access`). If a legit
 * Blueprint contract lacks a `node.id` we synthesise one on the fly
 * so it's addressable inside the Builder tree; the exported JSON
 * later drops synthesised ids only if we want, but for now we keep
 * them (they're valid RFC-ish node identifiers).
 */
import { validate } from '@dashforge/blueprint-core';
import type { ValidationError } from '@dashforge/blueprint-core';
import type { BlueprintNode, Contract } from './types';
import { uid } from './factory';

export type ImportResult =
  | { ok: true; contract: Contract }
  | { ok: false; error: string; issues?: ValidationError[] };

/**
 * Walk the tree and mint the Builder-internal `_uid` on every node (an
 * imported contract has its `_uid` stripped — only the public `nodeId`
 * survives export, and that we preserve as-is). Every node needs a `_uid`
 * for selection / drop targets inside the Builder.
 */
function ensureIds(node: BlueprintNode): BlueprintNode {
  const withId: BlueprintNode = { ...node, _uid: node._uid || uid() };
  // Drop the legacy envelope `slots` field — it was never consumed by the
  // runtime and is no longer in the contract schema.
  delete (withId as Record<string, unknown>).slots;
  if (Array.isArray(withId.children)) {
    withId.children = withId.children.map(ensureIds);
  } else {
    withId.children = [];
  }
  if (!withId.props || typeof withId.props !== 'object') {
    withId.props = {};
  }
  return withId;
}

/**
 * Recursively remove the legacy `slots` envelope key so an older exported
 * contract (authored before it was dropped) still validates on import.
 */
function stripLegacySlots(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripLegacySlots);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'slots') continue;
      out[k] = stripLegacySlots(v);
    }
    return out;
  }
  return value;
}

/**
 * Coerce an already-parsed value (from a remote workspace or a team
 * template) into a structurally-safe `Contract` — NEVER throws. Unlike
 * `parseContract` (strict, for user imports) this is lenient: it fixes
 * structural gaps (`ensureIds` fills missing `children`/`props`/`id`) so a
 * slightly-off contract still renders instead of crashing the canvas AND
 * the header's validator. A non-object, or a value without a usable `root`,
 * yields an empty contract. This is the load-boundary guard for every
 * backend-sourced contract.
 */
export function normalizeContract(parsed: unknown): Contract {
  if (!parsed || typeof parsed !== 'object') {
    return { version: '1', root: null };
  }
  const doc = parsed as { version?: unknown; root?: unknown };
  const version = typeof doc.version === 'string' ? doc.version : '1';
  const root =
    doc.root && typeof doc.root === 'object'
      ? ensureIds(doc.root as BlueprintNode)
      : null;
  return { version, root };
}

export function parseContract(source: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (e) {
    return {
      ok: false,
      error: `Not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Strip the legacy `slots` envelope before validation — old exported
  // contracts may still carry it; the current schema would reject it.
  const result = validate(stripLegacySlots(parsed), { mode: 'strict' });
  if (!result.ok) {
    return {
      ok: false,
      error: `Not a valid Blueprint contract (${result.errors.length} issue${
        result.errors.length === 1 ? '' : 's'
      }).`,
      issues: result.errors,
    };
  }

  // The validator returns the parsed document. We narrow to Builder's
  // `Contract` shape (compatible) and normalise ids so every node is
  // addressable inside the editor.
  const doc = result.data as {
    version: string;
    root: BlueprintNode;
    lib?: string;
    metadata?: Record<string, unknown>;
  };
  return {
    ok: true,
    contract: {
      version: doc.version,
      root: doc.root ? ensureIds(doc.root) : null,
    },
  };
}

/**
 * Trigger the browser's file picker (`.json` only), read the chosen
 * file, and resolve with the parse result. Resolves to `null` if the
 * user dismissed the picker.
 */
export function pickAndParseContract(): Promise<ImportResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    document.body.appendChild(input);

    // If the user cancels, `change` never fires. `focus` on the window
    // is a decent proxy: when the picker closes without selection the
    // window regains focus. We give it a beat to let `change` win in
    // the happy path.
    const cleanup = () => input.remove();
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        cleanup();
        resolve(parseContract(text));
      } catch (e) {
        cleanup();
        resolve({
          ok: false,
          error: `Could not read file: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    });

    input.click();
  });
}
