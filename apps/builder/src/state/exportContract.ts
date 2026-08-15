/**
 * Contract export helpers — turn the in-memory contract into a JSON
 * file the user can download, and into a clipboard-friendly string.
 *
 * The Builder does NOT strip Builder-only fields today (none exist —
 * the state shape matches Blueprint's canonical `nodeSchema` verbatim).
 * If Builder-only metadata gets added later, a `serialize()` pass
 * would live here.
 */
import type { Contract } from './types';

/**
 * Suggest a filename for the download. Prefers the root's envelope id
 * (e.g. `checkout.json`), falls back to `untitled.json`. Sanitises
 * whitespace and filesystem-hostile characters.
 */
export function filenameForContract(contract: Contract): string {
  const id = contract.root?.nodeId ?? 'untitled';
  const safe = id.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return (safe || 'untitled') + '.json';
}

/**
 * Filename for a specific exported version, tagging provenance in the
 * name (never in the payload) — e.g. `checkout.v5.json`, or with the
 * environment it's marked on, `checkout.production.v5.json`. Keeps the
 * exported JSON exactly what the Blueprint runtime consumes.
 */
export function filenameForVersion(
  contract: Contract,
  opts: { version: number; env?: string },
): string {
  const base = filenameForContract(contract).replace(/\.json$/, '');
  const env = opts.env
    ? '.' + opts.env.replace(/[^a-zA-Z0-9_-]+/g, '-')
    : '';
  return `${base}${env}.v${opts.version}.json`;
}

/** Pretty-printed JSON — the shape Blueprint runtime consumes. */
export function serializeContract(contract: Contract): string {
  return JSON.stringify(stripUid(contract), null, 2);
}

/**
 * Strip the Builder-only `_uid` handle from every node so it never
 * leaves the Builder. The public `nodeId` is kept — it's the exported
 * addressing key. Runs on every export path (download + copy) and before
 * validation (core's `.strict()` schema rejects the unknown `_uid` key).
 */
export function stripUid<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripUid) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '_uid') continue;
      out[k] = stripUid(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Trigger a browser download of the contract as a .json file.
 * Uses a temporary Blob URL cleaned up on next microtask.
 */
export function downloadContract(contract: Contract, filename?: string): void {
  const blob = new Blob([serializeContract(contract)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? filenameForContract(contract);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a beat to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Copy the pretty-printed JSON to the clipboard. Returns whether the
 * write ACTUALLY succeeded, so the caller can surface feedback.
 *
 * Uses the async Clipboard API when available (secure context: https or
 * localhost) and falls back to a hidden-textarea + `execCommand` path for
 * non-secure contexts — e.g. the dev server reached over a LAN IP — where
 * `navigator.clipboard` is `undefined`. The previous implementation
 * `await navigator.clipboard?.writeText(...)` silently resolved to
 * `undefined` in that case and reported a false success while copying
 * nothing.
 */
export async function copyContract(contract: Contract): Promise<boolean> {
  return copyText(serializeContract(contract));
}

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied / transient focus loss — fall through to legacy.
    }
  }
  return legacyCopy(text);
}

/**
 * Legacy clipboard write for non-secure contexts where the async
 * Clipboard API is unavailable. Selects a throwaway off-screen textarea,
 * runs `document.execCommand('copy')`, then restores any prior selection
 * it clobbered.
 */
function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  const selection = document.getSelection();
  const prevRange =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  if (prevRange && selection) {
    selection.removeAllRanges();
    selection.addRange(prevRange);
  }
  return ok;
}
