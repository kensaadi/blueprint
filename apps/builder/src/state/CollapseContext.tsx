/* eslint-disable react-refresh/only-export-components -- provider colocates with its consumer hooks */
/**
 * CollapseContext — tracks which container nodes the user has
 * collapsed on the Canvas. Pure UI state; never round-trips through
 * the exported contract JSON. Persisted in the session snapshot so a
 * refresh (or reopen) restores the visual state.
 *
 * Three hooks:
 *   - `useIsCollapsed(nodeId)` → boolean (subscribes to Set membership)
 *   - `useToggleCollapse()`    → (nodeId: string) => void
 *   - `useCollapsedIds()`      → readonly Set<string> (for size probes)
 *
 * Persistence write is debounced identically to the session snapshot
 * (500ms) so toggling several nodes in a burst produces a single write.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  loadCollapsedIds,
  loadSession,
  persistSession,
} from './persistence';

const PERSIST_DEBOUNCE_MS = 500;

type CollapseCtxValue = {
  ids: Set<string>;
  toggle: (nodeId: string) => void;
  setAll: (ids: string[]) => void;
};

const CollapseCtx = createContext<CollapseCtxValue | null>(null);

export function CollapseProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(() => loadCollapsedIds());
  const timer = useRef<number | null>(null);
  const lastPersistedRef = useRef<Set<string>>(ids);

  const toggle = useCallback((nodeId: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const setAll = useCallback((nextIds: string[]) => {
    setIds(new Set(nextIds));
  }, []);

  // Debounced write back to the session snapshot so refresh restores
  // the collapse layout. Re-reads the current session envelope so we
  // don't clobber the contract / fileRef that the state provider owns.
  useEffect(() => {
    if (ids === lastPersistedRef.current) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const snapshot = loadSession();
      persistSession(
        snapshot?.contract ?? { version: '1.0', root: null },
        snapshot?.fileRef ?? null,
        [...ids],
      );
      lastPersistedRef.current = ids;
    }, PERSIST_DEBOUNCE_MS);
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [ids]);

  const value = useMemo<CollapseCtxValue>(
    () => ({ ids, toggle, setAll }),
    [ids, toggle, setAll],
  );
  return <CollapseCtx.Provider value={value}>{children}</CollapseCtx.Provider>;
}

export function useIsCollapsed(nodeId: string): boolean {
  const ctx = useContext(CollapseCtx);
  if (!ctx) return false;
  return ctx.ids.has(nodeId);
}

export function useToggleCollapse(): (nodeId: string) => void {
  const ctx = useContext(CollapseCtx);
  if (!ctx) throw new Error('useToggleCollapse must be used inside CollapseProvider');
  return ctx.toggle;
}

export function useCollapsedIds(): { ids: Set<string>; setAll: (ids: string[]) => void } {
  const ctx = useContext(CollapseCtx);
  if (!ctx) throw new Error('useCollapsedIds must be used inside CollapseProvider');
  return { ids: ctx.ids, setAll: ctx.setAll };
}
