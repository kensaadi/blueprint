import { isApiError } from './error.types';
import { normalizeAxiosError } from './error.normalize';
import type { Result } from './result.types';

/**
 * Wraps a promise that may throw and returns the canonical
 * `Result<T>` envelope. Every service function in the api layer ends
 * with `return attempt(provider.someMethod(input))` so the caller
 * never needs try/catch.
 *
 * The response interceptor already throws ApiError-shaped objects on
 * rejection, so the typical catch path here just unwraps that. The
 * `normalizeAxiosError` fallback covers the rare case where a provider
 * throws something other than an ApiError (e.g. a mock throwing).
 */
export async function attempt<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (raw) {
    return {
      data: null,
      error: isApiError(raw) ? raw : normalizeAxiosError(raw),
    };
  }
}
