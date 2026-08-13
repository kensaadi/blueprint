import { PROVIDER } from '../_shared/config';
import type { LicenseStatus, LicenseToken } from './types';

/**
 * Contract every license provider implements. Retrieval is keyed by the
 * unguessable Stripe session id (no auth) — the buyer polls it after
 * checkout while the webhook mints the token. `live.ts` talks to
 * Foundry; `mock.ts` has no offline analogue and fails loudly.
 *
 *   getBySession → GET /licenses?session_id=…
 *   getStatus    → GET /licenses/:id
 */
export interface LicenseProviderApi {
  getBySession(sessionId: string): Promise<LicenseToken>;
  getStatus(licenseId: string): Promise<LicenseStatus>;
}

const providerMapping: Record<string, () => Promise<LicenseProviderApi>> = {
  live: () => import('./live').then((m) => m.default),
  mock: () => import('./mock').then((m) => m.default),
};

export async function licenseProvider(): Promise<LicenseProviderApi> {
  const loader = providerMapping[PROVIDER];
  if (!loader) {
    throw new Error(`[license] provider "${PROVIDER}" not supported`);
  }
  return loader();
}
