/**
 * Blueprint runtime warn channel — surfaces user-code failures without
 * crashing the render.
 *
 * Silent in production. `import.meta.env.PROD` is a boolean set by Vite
 * (and by the eventual monorepo bundler); anything else falls back to
 * NODE_ENV. This lives in a single module so tests can spy on it and
 * consumers who want to route warnings elsewhere can shadow the console.
 */

const isProd = (() => {
  try {
    // Vite / esbuild define
    if (typeof import.meta !== 'undefined' && (import.meta as { env?: { PROD?: boolean } }).env?.PROD)
      return true;
  } catch {
    /* import.meta not available (older bundlers) */
  }
  // Node / SSR fallback — reached via globalThis so this browser-runtime
  // package needs no @types/node dependency in its public .d.ts.
  const g = globalThis as { process?: { env?: { NODE_ENV?: string } } };
  if (g.process?.env?.NODE_ENV === 'production') return true;
  return false;
})();

export function bpWarn(scope: string, message: string, cause?: unknown): void {
  if (isProd) return;
  const prefix = `[blueprint] ${scope}:`;
  if (cause !== undefined) {
    console.warn(prefix, message, cause);
  } else {
    console.warn(prefix, message);
  }
}
