import type { ApiErrorCode } from './error.types';

/**
 * Default human messages keyed by ApiErrorCode. The BE message wins
 * when present (the server knows the domain best); we fall back to
 * these defaults for network errors, 5xx without body, and unknown
 * shapes.
 */
const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  NETWORK_ERROR: 'Cannot reach the server. Check your connection.',
  TIMEOUT: 'The request took too long. Please retry.',
  UNAUTHORIZED: 'Please sign in again.',
  FORBIDDEN: 'You do not have permission to do that.',
  NOT_FOUND: 'Not found.',
  CONFLICT: 'This operation conflicts with the current state.',
  VALIDATION_ERROR: 'Please check the highlighted fields.',
  SERVER_ERROR: 'A server error occurred. Please retry in a moment.',
  CONTRACT_MISMATCH: 'Unexpected response from server. Please retry.',
  BUSINESS_ERROR: 'Operation could not be completed.',
  UNKNOWN: 'Something went wrong.',
};

/**
 * Resolves the final user-facing message for an error.
 *
 * Priority:
 *   1. `rawMessage` from the BE, if non-empty (server knows best)
 *   2. Default for the classified code
 *   3. Hard fallback (UNKNOWN)
 */
export function humanize(args: {
  rawMessage?: string;
  code: ApiErrorCode;
}): string {
  if (args.rawMessage && args.rawMessage.trim().length > 0) {
    return args.rawMessage;
  }
  return DEFAULT_MESSAGES[args.code] ?? DEFAULT_MESSAGES.UNKNOWN;
}
