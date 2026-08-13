import foundryClient from '../_shared/foundry.client';
import type { LicenseProviderApi } from './provider';
import {
  LicenseStatusSchema,
  LicenseTokenSchema,
  type LicenseStatus,
  type LicenseToken,
} from './types';

async function getBySession(sessionId: string): Promise<LicenseToken> {
  const { data } = await foundryClient.get('/licenses', {
    params: { session_id: sessionId },
    responseSchema: LicenseTokenSchema,
  });
  return data;
}

async function getStatus(licenseId: string): Promise<LicenseStatus> {
  const { data } = await foundryClient.get(
    `/licenses/${encodeURIComponent(licenseId)}`,
    { responseSchema: LicenseStatusSchema },
  );
  return data;
}

const licenseLiveProvider: LicenseProviderApi = { getBySession, getStatus };
export default licenseLiveProvider;
