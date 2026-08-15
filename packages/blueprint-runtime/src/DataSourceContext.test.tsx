/**
 * useResolvedList — resolves the static-or-dynamic list prop
 * (select/radio/autocomplete options, breadcrumbs items) to a plain
 * array, honoring the DashBlueprint `resolveData` resolver with a
 * `sample` design-time fallback and static `prepend`/`append` wrapping.
 */
import { describe, expect, test } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { DataSourceProvider, useResolvedList, type DataResolver } from './DataSourceContext';

type Opt = { value: string; label: string };
const A = { value: 'a', label: 'A' };
const B = { value: 'b', label: 'B' };
const ALL = { value: 'all', label: 'All' };

function wrapperWith(resolve?: DataResolver) {
  return ({ children }: { children: ReactNode }) => (
    <DataSourceProvider resolve={resolve}>{children}</DataSourceProvider>
  );
}

describe('useResolvedList', () => {
  test('passes a static array through unchanged', () => {
    const { result } = renderHook(() => useResolvedList<Opt>([A, B]));
    expect(result.current).toEqual([A, B]);
  });

  test('returns [] for undefined', () => {
    const { result } = renderHook(() => useResolvedList<Opt>(undefined));
    expect(result.current).toEqual([]);
  });

  test('bound value with no resolver falls back to sample', () => {
    const { result } = renderHook(() =>
      useResolvedList<Opt>({ source: '$data.x', sample: [A] }),
    );
    expect(result.current).toEqual([A]);
  });

  test('bound value resolves through the provider resolver', () => {
    const { result } = renderHook(
      () => useResolvedList<Opt>({ source: '$data.countries', sample: [A] }),
      { wrapper: wrapperWith(() => [B]) },
    );
    expect(result.current).toEqual([B]); // resolver wins over sample
  });

  test('resolver returning undefined falls back to sample', () => {
    const { result } = renderHook(
      () => useResolvedList<Opt>({ source: '$data.missing', sample: [A] }),
      { wrapper: wrapperWith(() => undefined) },
    );
    expect(result.current).toEqual([A]);
  });

  test('prepend/append wrap the resolved list (hybrid)', () => {
    const { result } = renderHook(
      () =>
        useResolvedList<Opt>({
          source: '$data.countries',
          prepend: [ALL],
          append: [B],
        }),
      { wrapper: wrapperWith(() => [A]) },
    );
    expect(result.current).toEqual([ALL, A, B]);
  });

  test('prepend/append wrap the sample when unresolved', () => {
    const { result } = renderHook(() =>
      useResolvedList<Opt>({ source: '$data.x', prepend: [ALL], sample: [A] }),
    );
    expect(result.current).toEqual([ALL, A]);
  });
});
