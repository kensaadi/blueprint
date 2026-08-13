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
  const id = contract.root?.id ?? 'untitled';
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
  return JSON.stringify(contract, null, 2);
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
 * write succeeded — the caller can surface a toast either way.
 */
export async function copyContract(contract: Contract): Promise<boolean> {
  try {
    await navigator.clipboard?.writeText(serializeContract(contract));
    return true;
  } catch {
    return false;
  }
}
