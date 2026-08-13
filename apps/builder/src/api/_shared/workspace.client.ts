import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { ZodType } from 'zod';
import { WORKSPACE_API_URL } from './config';
import { normalizeAxiosError } from './error.normalize';
import type { ApiError } from './error.types';
import { clearSession, sessionToken } from '../workspace/session';

/**
 * HTTP client for the customer's self-hosted Workspace Service — the
 * Builder's OWN backend, and its FIRST authenticated surface.
 *
 * Opposite of the Foundry client: this one carries a **Bearer session**
 * (from the workspace session store) on every request. We use a bearer
 * header, not cookies, so calls from the Builder's arbitrary origin to
 * the customer's WS don't need SameSite/credential gymnastics — and the
 * WS can stay wildcard-CORS.
 *
 * Interceptors:
 *   - request: attach `Authorization: Bearer <token>` when signed in.
 *   - response: validate an attached zod schema (→ CONTRACT_MISMATCH),
 *     normalize errors, and clear the session on 401 so a stale token
 *     doesn't stick.
 */

declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface AxiosRequestConfig {
    responseSchema?: ZodType;
  }
}

const workspaceClient = axios.create({
  baseURL: WORKSPACE_API_URL,
  timeout: 15_000,
});

// Request: inject the Bearer session token when present.
workspaceClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = sessionToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
);

// Response: schema-validate, normalize, and drop a dead session on 401.
workspaceClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const schema = response.config.responseSchema;
    if (schema) {
      const parsed = schema.safeParse(response.data);
      if (!parsed.success) {
        const apiError: ApiError = {
          code: 'CONTRACT_MISMATCH',
          message: 'Unexpected response from the workspace service.',
          status: response.status,
          cause: parsed.error,
        };
        throw apiError;
      }
      response.data = parsed.data;
    }
    return response;
  },
  (error) => {
    const apiError = normalizeAxiosError(error);
    if (apiError.code === 'UNAUTHORIZED') {
      // A 401 means the session expired or is invalid — clear it so the
      // UI falls back to signed-out state instead of looping.
      clearSession();
    }
    return Promise.reject(apiError);
  },
);

export default workspaceClient;
