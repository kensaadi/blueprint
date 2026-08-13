import { isAxiosError } from 'axios';
import { humanize } from './error.humanize';
import { isApiError, type ApiError, type ApiErrorCode } from './error.types';

/**
 * Maps HTTP status → ApiErrorCode. The single source of truth for
 * "what kind of error did the BE return?". Foundry's paid-without-
 * receipt gate answers 402 → classified as BUSINESS_ERROR (the >= 400
 * fallback) so the UI can prompt "purchase required".
 */
function classifyStatus(status: number): ApiErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422) return 'VALIDATION_ERROR';
  if (status >= 500) return 'SERVER_ERROR';
  if (status >= 400) return 'BUSINESS_ERROR';
  return 'UNKNOWN';
}

/**
 * Defensive extractor: reads a server-side error message from the
 * response body without assuming a rigid shape.
 *
 * Supports the Foundry envelope and common alternatives:
 *   - Foundry:      { "error": { "message": "..." } }
 *   - flat string:  { "error": "string message" }
 *
 * Returns undefined if neither is present.
 */
function pickServerMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return undefined;
  }
  const err = (body as { error: unknown }).error;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return undefined;
}

/**
 * Defensive extractor: reads a server-side machine code (e.g.
 * "not_found") when the BE provides one — Foundry nests it under
 * `error.code`.
 */
function pickServerCode(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  if ('code' in body && typeof (body as { code: unknown }).code === 'string') {
    return (body as { code: string }).code;
  }
  if ('error' in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = (err as { code: unknown }).code;
      if (typeof code === 'string') return code;
    }
  }
  return undefined;
}

/**
 * Defensive extractor: reads field-level validation errors.
 *
 *   { "details": { "email": "invalid", "seats": "min 3" } }
 *
 * Only string values are kept; anything else is silently dropped.
 */
function pickServerDetails(body: unknown): Record<string, string> | undefined {
  if (typeof body !== 'object' || body === null || !('details' in body)) {
    return undefined;
  }
  const details = (body as { details: unknown }).details;
  if (typeof details !== 'object' || details === null) return undefined;

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(details)) {
    if (typeof v === 'string') out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Single chokepoint for converting any raw error into a normalized
 * ApiError. Called by the response interceptor; nothing else in the
 * codebase reconstructs an error.
 *
 * Path coverage:
 *   1. Already-normalized ApiError (e.g. thrown by schema validation)
 *   2. AxiosError without response → NETWORK_ERROR / TIMEOUT
 *   3. AxiosError with response    → classified by HTTP status
 *   4. Other Error instance        → wrapped as UNKNOWN
 *   5. Anything else               → generic UNKNOWN
 */
export function normalizeAxiosError(raw: unknown): ApiError {
  if (isApiError(raw)) return raw;

  if (isAxiosError(raw)) {
    if (!raw.response) {
      const isTimeout = raw.code === 'ECONNABORTED';
      const code: ApiErrorCode = isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR';
      return { code, message: humanize({ code }), cause: raw };
    }

    const status = raw.response.status;
    const body = raw.response.data as unknown;
    const code = classifyStatus(status);

    return {
      code,
      message: humanize({ rawMessage: pickServerMessage(body), code }),
      status,
      serverCode: pickServerCode(body),
      details: pickServerDetails(body),
      cause: raw,
    };
  }

  if (raw instanceof Error) {
    return {
      code: 'UNKNOWN',
      message: raw.message || humanize({ code: 'UNKNOWN' }),
      cause: raw,
    };
  }

  return { code: 'UNKNOWN', message: humanize({ code: 'UNKNOWN' }), cause: raw };
}
