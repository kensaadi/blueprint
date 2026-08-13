/**
 * Canonical error shape exposed to the application after every API
 * call. Constructed by `normalizeAxiosError` (single chokepoint) and
 * carried inside `Result<T>.error`.
 *
 * `code` is the discriminator UI logic branches on. `message` is
 * always human-readable and safe to display. `status` / `details` /
 * `serverCode` carry the original context when available; `cause`
 * holds the raw error for logging.
 *
 * Ported from the booking-kit api layer. Foundry is auth-less, so
 * UNAUTHORIZED/FORBIDDEN are rare here — but the codes stay for the
 * future authed workspace client.
 */

export type ApiErrorCode =
  /** Network unreachable — no response received. */
  | 'NETWORK_ERROR'
  /** Request exceeded the client timeout. */
  | 'TIMEOUT'
  /** HTTP 401 — token missing or invalid. */
  | 'UNAUTHORIZED'
  /** HTTP 403 — authenticated but not allowed. */
  | 'FORBIDDEN'
  /** HTTP 404 — resource does not exist. */
  | 'NOT_FOUND'
  /** HTTP 409 — request conflicts with current state. */
  | 'CONFLICT'
  /** HTTP 402/422 — payment required / validation failed. */
  | 'VALIDATION_ERROR'
  /** HTTP 5xx — server-side failure. */
  | 'SERVER_ERROR'
  /** 2xx but response body did not match the expected schema. */
  | 'CONTRACT_MISMATCH'
  /** Other 4xx — domain-level error with a server-provided message. */
  | 'BUSINESS_ERROR'
  /** Anything we could not classify. */
  | 'UNKNOWN';

export interface ApiError {
  /** Discriminator for branching UI logic. */
  code: ApiErrorCode;
  /** Human-readable message, always populated, safe to display. */
  message: string;
  /** HTTP status, if the request reached the server. */
  status?: number;
  /** Field-level errors for `VALIDATION_ERROR` (field name → message). */
  details?: Record<string, string>;
  /** Server-side machine code, when the BE provides one. */
  serverCode?: string;
  /** Original raw error, kept for logging — never shown to users. */
  cause?: unknown;
}

/**
 * Whitelist of known ApiError codes. Used by `isApiError` to
 * distinguish our normalized errors from foreign objects that happen
 * to have `code` + `message` string fields (e.g. AxiosError has
 * `code: 'ECONNABORTED'` and `message: 'timeout'`).
 */
const API_ERROR_CODES: ReadonlySet<string> = new Set<ApiErrorCode>([
  'NETWORK_ERROR',
  'TIMEOUT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_ERROR',
  'SERVER_ERROR',
  'CONTRACT_MISMATCH',
  'BUSINESS_ERROR',
  'UNKNOWN',
]);

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as { code: unknown }).code === 'string' &&
    typeof (value as { message: unknown }).message === 'string' &&
    API_ERROR_CODES.has((value as { code: string }).code)
  );
}
