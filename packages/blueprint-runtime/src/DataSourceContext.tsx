/**
 * Data-source context — resolves the dynamic (backend-bound) form of a
 * list prop (select/radio/autocomplete `options`, breadcrumbs `items`)
 * to a plain array at render time.
 *
 * A list prop can be authored statically (an array) OR bound to a data
 * source: `{ source: "$data.countries", sample?, prepend?, append? }`.
 * The consumer wires a resolver via `<DashBlueprint resolveData={fn}>`;
 * `useResolvedList` turns either form into the array the binding renders.
 * When unresolved (design time, or no resolver wired) it falls back to
 * `sample` so the UI is never empty. Mirrors the `$form.` resolver in
 * blueprint-core/evaluate.ts, one prefix over (`$data.`).
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { isBoundList } from '@dashforge/blueprint-core';

/** Resolves a `$data.<key>` (or any `$prefix.path`) reference to a list. */
export type DataResolver = (source: string) => unknown[] | undefined;

const DataSourceContext = createContext<DataResolver | null>(null);

export function DataSourceProvider({
  resolve,
  children,
}: {
  resolve?: DataResolver;
  children: ReactNode;
}) {
  return (
    <DataSourceContext.Provider value={resolve ?? null}>
      {children}
    </DataSourceContext.Provider>
  );
}

type BoundListValue<T> = {
  source: string;
  sample?: T[];
  prepend?: T[];
  append?: T[];
};

/**
 * Resolve a list-prop value to a plain array:
 *  - static array → returned as-is
 *  - bound value  → `[...prepend, ...(resolve(source) ?? sample ?? []), ...append]`
 *  - undefined    → `[]`
 */
export function useResolvedList<T>(
  value: ReadonlyArray<T> | BoundListValue<T> | undefined,
): T[] {
  const resolve = useContext(DataSourceContext);
  return useMemo(() => {
    if (value == null) return [];
    if (Array.isArray(value)) return value as T[];
    if (isBoundList(value)) {
      const bound = value as BoundListValue<T>;
      const resolved =
        (resolve?.(bound.source) as T[] | undefined) ?? bound.sample ?? [];
      return [...(bound.prepend ?? []), ...resolved, ...(bound.append ?? [])];
    }
    return [];
  }, [value, resolve]);
}
