/**
 * Runtime configuration for the Builder's api layer.
 *
 * Read from Vite's import.meta.env at module load. Unlike the kit,
 * BOTH values have safe defaults so the Builder boots with zero .env:
 *
 *   - VITE_PROVIDER      — 'mock' (default) or 'live'. Mock keeps the
 *     app byte-identical to the static scaffolding; 'live' talks to
 *     Foundry. Default 'mock' so a fresh checkout Just Works offline.
 *   - VITE_FOUNDRY_API_URL — base URL of the Foundry control plane.
 *     Defaults to production; override for a local Foundry.
 *   - VITE_WORKSPACE_API_URL — base URL of the customer's self-hosted
 *     Workspace Service (authed). Optional: unset ⇒ no workspace, the
 *     Builder runs local-only (Community + offline token). `HAS_WORKSPACE`
 *     reports whether one is configured.
 *
 * Foundry is AUTH-LESS by design (trust flows through signed tokens +
 * unguessable ids). The Workspace Service is the opposite — authed — so
 * its client carries a Bearer session (see workspace.client.ts).
 */

export type ProviderType = 'live' | 'mock';

const DEFAULT_FOUNDRY_API_URL = 'https://foundry.dashforge-ui.com';

export const PROVIDER: ProviderType =
  (import.meta.env.VITE_PROVIDER as ProviderType | undefined) ?? 'mock';

export const FOUNDRY_API_URL: string = (
  (import.meta.env.VITE_FOUNDRY_API_URL as string | undefined) ??
  DEFAULT_FOUNDRY_API_URL
).replace(/\/+$/, '');

const RAW_WORKSPACE_API_URL = (
  import.meta.env.VITE_WORKSPACE_API_URL as string | undefined
)?.trim();

/** Base URL of the self-hosted Workspace Service, or '' when unconfigured. */
export const WORKSPACE_API_URL: string = (RAW_WORKSPACE_API_URL ?? '').replace(
  /\/+$/,
  '',
);

/** Whether a Workspace Service is configured (paid features live there). */
export const HAS_WORKSPACE: boolean = WORKSPACE_API_URL !== '';
