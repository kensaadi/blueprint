/**
 * IntlContext tests — provider stashes the resolver, hook reads it, and
 * returns null when no provider is in scope (the "i18n is opt-in" path).
 */
import { describe, expect, test, afterEach } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { IntlProvider, useIntl } from './IntlContext';
import type { IntlConfig } from '@dashforge/blueprint-core';

afterEach(() => cleanup());

const intl: IntlConfig = { t: (key) => `T:${key}` };

describe('useIntl', () => {
  test('returns null without a provider', () => {
    const { result } = renderHook(() => useIntl());
    expect(result.current).toBeNull();
  });

  test('returns the supplied config inside a provider', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <IntlProvider intl={intl}>{children}</IntlProvider>
    );
    const { result } = renderHook(() => useIntl(), { wrapper });
    expect(result.current).toBe(intl);
    expect(result.current?.t('a.b')).toBe('T:a.b');
  });

  test('a provider without an intl prop reads back as null', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <IntlProvider>{children}</IntlProvider>
    );
    const { result } = renderHook(() => useIntl(), { wrapper });
    expect(result.current).toBeNull();
  });
});
