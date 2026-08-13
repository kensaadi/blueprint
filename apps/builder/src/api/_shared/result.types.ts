import type { ApiError } from './error.types';

/**
 * Discriminated result returned by every service function in the api
 * layer.
 *
 *   - Success → `{ data: T,    error: null }`
 *   - Failure → `{ data: null, error: ApiError }`
 *
 * Service functions never throw. The UI branches on `result.error`
 * without try/catch.
 *
 *   const r = await getCatalog();
 *   if (r.error) return toast.error(r.error.message);
 *   setCards(r.data);
 */
export type Result<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };
