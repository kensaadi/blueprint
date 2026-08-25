import { PROVIDER } from '../_shared/config';
import type { ExtractInput, ExtractResponse, QuotaStatus } from './types';

/**
 * Contract every AI provider implements. `live.ts` talks to Foundry over
 * HTTP (bearer license token); `mock.ts` returns a canned contract + an
 * in-memory quota so the whole AI flow — orchestration, validation,
 * repair, UI — runs offline with no key and no spend. Chosen by
 * `VITE_PROVIDER`, mirroring the marketplace split.
 *
 * Methods THROW on failure (ApiError-shaped); the service layer wraps
 * each call in `attempt()` to return the `Result<T>` envelope.
 *
 *   extract   → POST /ai/extract
 *   getQuota  → GET  /ai/quota
 */
export interface AIProvider {
  extract(input: ExtractInput): Promise<ExtractResponse>;
  getQuota(): Promise<QuotaStatus>;
}

const providerMapping: Record<string, () => Promise<AIProvider>> = {
  live: () => import('./live').then((m) => m.default),
  mock: () => import('./mock').then((m) => m.default),
};

export async function aiProvider(): Promise<AIProvider> {
  const loader = providerMapping[PROVIDER];
  if (!loader) {
    throw new Error(`[ai] provider "${PROVIDER}" not supported`);
  }
  return loader();
}
