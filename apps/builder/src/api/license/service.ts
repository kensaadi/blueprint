import { attempt } from '../_shared/attempt';
import type { Result } from '../_shared/result.types';
import { licenseProvider } from './provider';
import type { LicenseStatus, LicenseToken } from './types';

/**
 * License api surface — `Result<T>` envelopes. `getBySession` backs the
 * post-checkout return flow (poll until the webhook mints the token);
 * `getStatus` is a lightweight license-state check.
 */

export async function getBySession(
  sessionId: string,
): Promise<Result<LicenseToken>> {
  const provider = await licenseProvider();
  return attempt(provider.getBySession(sessionId));
}

export async function getStatus(
  licenseId: string,
): Promise<Result<LicenseStatus>> {
  const provider = await licenseProvider();
  return attempt(provider.getStatus(licenseId));
}
