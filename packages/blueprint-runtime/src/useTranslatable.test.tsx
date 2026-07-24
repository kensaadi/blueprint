/**
 * useTranslatable / resolveTranslatableValue tests — literal passthrough,
 * $t resolution against intl, graceful fallback to the key without a
 * provider, and throw-isolation when the consumer's `t` blows up.
 */
import { describe, expect, test, afterEach, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useTranslatable, resolveTranslatableValue } from './useTranslatable';
import { IntlProvider } from './IntlContext';
import type { IntlConfig } from '@dashforge/blueprint-core';

afterEach(() => cleanup());

const intl: IntlConfig = {
  t: (key, vars) => (vars?.name ? `Hi ${vars.name}` : `T:${key}`),
};

function withIntl(cfg?: IntlConfig) {
  return ({ children }: { children: ReactNode }) => (
    <IntlProvider intl={cfg}>{children}</IntlProvider>
  );
}

describe('resolveTranslatableValue (pure)', () => {
  test('returns undefined for null / undefined', () => {
    expect(resolveTranslatableValue(undefined, intl, null)).toBeUndefined();
    expect(resolveTranslatableValue(null as never, intl, null)).toBeUndefined();
  });

  test('passes a literal string through untouched', () => {
    expect(resolveTranslatableValue('Save', intl, null)).toBe('Save');
  });

  test('resolves a $t ref against intl', () => {
    expect(resolveTranslatableValue({ $t: 'common.save' }, intl, null)).toBe('T:common.save');
  });

  test('falls back to the key when no intl is in scope', () => {
    expect(resolveTranslatableValue({ $t: 'common.save' }, null, null)).toBe('common.save');
  });

  test('isolates a throwing translator and falls back to the key', () => {
    const boom: IntlConfig = {
      t: () => {
        throw new Error('bad translator');
      },
    };
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveTranslatableValue({ $t: 'x.y' }, boom, null)).toBe('x.y');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('useTranslatable (hook)', () => {
  test('resolves through the provider', () => {
    const { result } = renderHook(() => useTranslatable({ $t: 'common.save' }), {
      wrapper: withIntl(intl),
    });
    expect(result.current).toBe('T:common.save');
  });

  test('returns the key when the provider carries no intl', () => {
    const { result } = renderHook(() => useTranslatable({ $t: 'common.save' }), {
      wrapper: withIntl(undefined),
    });
    expect(result.current).toBe('common.save');
  });
});
