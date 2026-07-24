/**
 * warn channel tests — bpWarn routes through console.warn with a scoped
 * prefix in non-prod, and forwards an optional cause. (Prod-silencing is
 * decided at module load from import.meta.env.PROD / NODE_ENV, so it's
 * asserted implicitly by the fact that it warns under the test env.)
 */
import { describe, expect, test, vi, afterEach } from 'vitest';
import { bpWarn } from './warn';

afterEach(() => vi.restoreAllMocks());

describe('bpWarn', () => {
  test('prefixes the message with the blueprint scope', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    bpWarn('intl.t("x")', 'boom');
    expect(spy).toHaveBeenCalledWith('[blueprint] intl.t("x"):', 'boom');
  });

  test('forwards a cause when provided', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cause = new Error('why');
    bpWarn('scope', 'msg', cause);
    expect(spy).toHaveBeenCalledWith('[blueprint] scope:', 'msg', cause);
  });
});
