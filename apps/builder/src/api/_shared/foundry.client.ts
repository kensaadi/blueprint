import axios, { type AxiosResponse } from 'axios';
import type { ZodType } from 'zod';
import { FOUNDRY_API_URL } from './config';
import { normalizeAxiosError } from './error.normalize';
import type { ApiError } from './error.types';

/**
 * HTTP client for the Foundry control plane.
 *
 * AUTH-LESS BY DESIGN. The Foundry↔Builder contract carries no session
 * or bearer token: trust flows through Stripe-signed ids (session_id,
 * receiptId) and Ed25519-signed license tokens, verified offline.
 * Therefore this client has:
 *
 *   - NO request auth interceptor (nothing to attach)
 *   - NO 401→logout interceptor (Foundry never authenticates a user)
 *
 * It keeps only the two things worth centralizing across an
 * independently-deployed service boundary:
 *
 *   1. response schema validation — a zod schema attached per request
 *      turns a drifted Foundry payload into a CONTRACT_MISMATCH error
 *      instead of letting a malformed shape leak into the Builder.
 *   2. error normalization — every rejection funnels through
 *      `normalizeAxiosError` so callers only ever see `ApiError`.
 *
 * The future authed workspace client (`workspace.client.ts`) is the
 * place for bearer + 401 handling — kept strictly separate.
 */

/**
 * Extend axios's request config so each call can attach a zod schema
 * for response validation.
 */
declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface AxiosRequestConfig {
    responseSchema?: ZodType;
  }
}

const foundryClient = axios.create({
  baseURL: FOUNDRY_API_URL,
  timeout: 15_000,
});

// Response: validate schema if attached, then normalize errors.
//
// Success path: if the request carried a `responseSchema`, parse the
// body against it. A schema failure throws an ApiError so the catch
// branch handles it uniformly.
//
// Error path: every rejection is funneled through `normalizeAxiosError`
// so downstream code only ever sees the ApiError shape.
foundryClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const schema = response.config.responseSchema;
    if (schema) {
      const parsed = schema.safeParse(response.data);
      if (!parsed.success) {
        const apiError: ApiError = {
          code: 'CONTRACT_MISMATCH',
          message: 'Unexpected response from Foundry.',
          status: response.status,
          cause: parsed.error,
        };
        throw apiError;
      }
      response.data = parsed.data;
    }
    return response;
  },
  (error) => Promise.reject(normalizeAxiosError(error)),
);

export default foundryClient;
