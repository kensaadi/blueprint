import foundryClient from '../_shared/foundry.client';
import workspaceClient from '../_shared/workspace.client';
import type { ApiError } from '../_shared/error.types';
import { loadLicenseToken } from '../../licensing/licenseStore';
import { sessionToken } from '../workspace/session';
import type { AIProvider } from './provider';
import {
  ExtractResponseSchema,
  QuotaStatusSchema,
  type ExtractInput,
  type ExtractResponse,
  type QuotaStatus,
} from './types';

/**
 * Live AI provider. Two routes to the same grounded engine, chosen by which
 * credential the user holds:
 *
 *   - Pro (a license token) → Foundry directly, with the license as Bearer.
 *     Foundry meters the Pro quota by licenseId.
 *   - Community (a Workspace-Service session, no license) → the WS, which
 *     forwards to Foundry with a trusted shared secret and meters the free
 *     teaser quota by user id. The WS is the identity Foundry can trust.
 *
 * Same request/response shape on both, so the orchestrator above is
 * route-agnostic. No credential → UNAUTHORIZED (the panel shows the upgrade
 * CTA rather than a network error).
 */

function proPath(): boolean {
  return loadLicenseToken() !== null;
}

function noCredential(): ApiError {
  return {
    code: 'UNAUTHORIZED',
    message: 'Sign in or activate a Pro license to use AI.',
    status: 401,
  };
}

function proAuthHeader(): Record<string, string> {
  const token = loadLicenseToken();
  if (!token) throw noCredential();
  return { Authorization: `Bearer ${token}` };
}

async function extract(input: ExtractInput): Promise<ExtractResponse> {
  const body = {
    description: input.description ?? '',
    prior: input.prior ?? '',
    errors: input.errors ?? [],
  };
  if (proPath()) {
    const { data } = await foundryClient.post('/ai/extract', body, {
      responseSchema: ExtractResponseSchema,
      headers: proAuthHeader(),
    });
    return data;
  }
  // Community teaser via the WS (its interceptor attaches the Bearer session).
  if (!sessionToken()) throw noCredential();
  const { data } = await workspaceClient.post('/ai/extract', body, {
    responseSchema: ExtractResponseSchema,
  });
  return data;
}

async function getQuota(): Promise<QuotaStatus> {
  if (proPath()) {
    const { data } = await foundryClient.get('/ai/quota', {
      responseSchema: QuotaStatusSchema,
      headers: proAuthHeader(),
    });
    return data;
  }
  if (!sessionToken()) throw noCredential();
  const { data } = await workspaceClient.get('/ai/quota', {
    responseSchema: QuotaStatusSchema,
  });
  return data;
}

const aiLiveProvider: AIProvider = { extract, getQuota };
export default aiLiveProvider;
