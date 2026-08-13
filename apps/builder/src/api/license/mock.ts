import type { ApiError } from '../_shared/error.types';
import type { LicenseProviderApi } from './provider';
import type { LicenseStatus, LicenseToken } from './types';

/**
 * No offline analogue — licenses are minted by Foundry's Stripe webhook.
 * The mock fails loudly so a developer flips to `VITE_PROVIDER=live`.
 */
function makeError(
  code: ApiError['code'],
  message: string,
  status: number,
): ApiError {
  return { code, message, status };
}

async function getBySession(): Promise<LicenseToken> {
  throw makeError('NOT_FOUND', 'no licenses in mock mode', 404);
}

async function getStatus(): Promise<LicenseStatus> {
  throw makeError('NOT_FOUND', 'no licenses in mock mode', 404);
}

const licenseMockProvider: LicenseProviderApi = { getBySession, getStatus };
export default licenseMockProvider;
