/* eslint-disable react-refresh/only-export-components -- context provider colocates with its hooks by design */
/**
 * BuilderStateProvider — React Context wrapping the reducer.
 *
 * Three hooks are exposed:
 *   - `useBuilderState()`    — read the state (contract + selection)
 *   - `useBuilderDispatch()` — send an action (structural or undo/redo)
 *   - `useBuilderHistory()`  — read `{ canUndo, canRedo }` flags
 *
 * The reducer is wrapped by `historyReducer` so undo / redo work for
 * every structural mutation. Selection changes are excluded from the
 * history stack so Cmd+Z rewinds real edits, not click-to-select.
 *
 * Kept deliberately small — the reducers hold all logic; this file is
 * only the plumbing.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { BuilderState, Contract } from './types';
import {
  historyReducer,
  initHistory,
  canUndo,
  canRedo,
  type HistoryAction,
} from './history';
import { initialStateFromStorage, persistSession } from './persistence';

/** Debounce window before persisting to localStorage — long enough to
 *  batch a burst of keystrokes on the same field, short enough that a
 *  refresh 1s later still catches recent edits. */
const PERSIST_DEBOUNCE_MS = 500;

/**
 * Default seed — an empty contract with no root. The Builder never
 * forces a wrapper (form / page / …); the first drop decides what the
 * root atom will be.
 */
function defaultContract(): Contract {
  return {
    version: '1.0',
    root: null,
  };
}

function defaultState(): BuilderState {
  return {
    contract: defaultContract(),
    selectedId: null,
    hoveredId: null,
    fileRef: null,
  };
}

type HistoryFlags = { canUndo: boolean; canRedo: boolean };

const StateCtx = createContext<BuilderState | null>(null);
const DispatchCtx = createContext<React.Dispatch<HistoryAction> | null>(null);
const HistoryCtx = createContext<HistoryFlags | null>(null);
/**
 * `true` when the in-memory contract has diverged from what's on disk
 * and the debounced write hasn't fired yet. Cleared as soon as the
 * write completes. StatusBar reads this to render the unsaved dot.
 */
const DirtyCtx = createContext<boolean>(false);
/**
 * Callback exposed to imperative flows (save, saveAs, open) so they
 * can announce "the contract now matches what's on disk" — flips the
 * file-dirty flag off for the current buffer.
 */
const MarkSavedCtx = createContext<((c: Contract) => void) | null>(null);
/**
 * Reference-equal snapshot of the last contract we know is persisted
 * to a workspace file. Used by `useBuilderFileDirty()` to answer the
 * "you have unsaved changes" question independently of the session
 * autosave (which protects against refresh, not against explicit
 * discards like New / Open).
 */
const SavedContractCtx = createContext<Contract | null>(null);

export function BuilderStateProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: BuilderState;
}) {
  // Precedence for the initial state:
  //   1. Explicit prop (tests, story fixtures)
  //   2. localStorage-restored contract
  //   3. Empty default seed
  const seed = initial ?? initialStateFromStorage() ?? defaultState();
  const [history, dispatch] = useReducer(historyReducer, initHistory(seed));

  // Debounced persist. `useRef` for the timer so React StrictMode's
  // double-invocation of effects doesn't leak an interval.
  const timer = useRef<number | null>(null);
  // Reference identity of the last contract we successfully wrote to
  // storage. When the current `contract` !== this ref, the buffer is
  // dirty; after the debounced persist fires, the ref catches up.
  const lastPersistedRef = useRef(seed.contract);
  const [isDirty, setIsDirty] = useState(false);
  const contract = history.present.contract;
  const fileRef = history.present.fileRef;
  // Snapshot of the contract at the last known "clean" point — the
  // most recent save-to-workspace or open-from-workspace. Used by
  // useBuilderFileDirty() to answer "does this buffer differ from
  // what's persisted to the workspace file?". Starts as the seed's
  // contract when the session loaded a fileRef, else null (untitled
  // buffer with no on-disk baseline).
  const [savedContract, setSavedContract] = useState<Contract | null>(
    seed.fileRef ? seed.contract : null,
  );
  const markSaved = useCallback((nextContract: Contract) => {
    setSavedContract(nextContract);
  }, []);
  // Same short-circuit trick for the fileRef — `setFileRef` doesn't
  // touch the contract, so we can't rely on `contract` alone to
  // decide when to re-persist the session envelope.
  const lastPersistedFileRef = useRef(seed.fileRef);
  useEffect(() => {
    const contractChanged = contract !== lastPersistedRef.current;
    const fileRefChanged = fileRef !== lastPersistedFileRef.current;
    if (!contractChanged && !fileRefChanged) return;
    // Only the contract flips the dirty flag — a fileRef rename or
    // attach is metadata and shouldn't light up the "unsaved" chip.
    if (contractChanged) setIsDirty(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      // Session snapshot ALWAYS writes so a refresh restores the exact
      // buffer + fileRef. Named-workspace writes are opt-in via Save
      // / Save-As, not on every keystroke.
      persistSession(contract, fileRef);
      lastPersistedRef.current = contract;
      lastPersistedFileRef.current = fileRef;
      setIsDirty(false);
    }, PERSIST_DEBOUNCE_MS);
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [contract, fileRef]);

  const stateValue = useMemo(() => history.present, [history.present]);
  const flags = useMemo<HistoryFlags>(
    () => ({ canUndo: canUndo(history), canRedo: canRedo(history) }),
    [history],
  );
  return (
    <StateCtx.Provider value={stateValue}>
      <DispatchCtx.Provider value={dispatch}>
        <HistoryCtx.Provider value={flags}>
          <DirtyCtx.Provider value={isDirty}>
            <SavedContractCtx.Provider value={savedContract}>
              <MarkSavedCtx.Provider value={markSaved}>
                {children}
              </MarkSavedCtx.Provider>
            </SavedContractCtx.Provider>
          </DirtyCtx.Provider>
        </HistoryCtx.Provider>
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

/**
 * Returns whether the current buffer differs from the last workspace
 * save/open. A brand-new untitled buffer with content is "dirty"
 * (no baseline), a freshly opened file is clean, a modified opened
 * file is dirty. Used by New/Open to decide whether to prompt.
 */
export function useBuilderFileDirty(): boolean {
  const state = useContext(StateCtx);
  const saved = useContext(SavedContractCtx);
  if (!state) throw new Error('useBuilderFileDirty must be used inside BuilderStateProvider');
  // Empty buffer (no root) → never dirty. Any content on an untitled
  // buffer → dirty (nothing to compare against). Otherwise reference-
  // equal check against the last-saved snapshot.
  if (state.contract.root === null) return false;
  if (saved === null) return true;
  return state.contract !== saved;
}

/**
 * Announce that the current contract has been persisted to a workspace
 * file. Called by useFileOps after a successful save/saveAs/open.
 */
export function useBuilderMarkSaved(): (contract: Contract) => void {
  const fn = useContext(MarkSavedCtx);
  if (!fn) throw new Error('useBuilderMarkSaved must be used inside BuilderStateProvider');
  return fn;
}

export function useBuilderState(): BuilderState {
  const s = useContext(StateCtx);
  if (!s) throw new Error('useBuilderState must be used inside BuilderStateProvider');
  return s;
}

export function useBuilderDispatch(): React.Dispatch<HistoryAction> {
  const d = useContext(DispatchCtx);
  if (!d) throw new Error('useBuilderDispatch must be used inside BuilderStateProvider');
  return d;
}

export function useBuilderDirty(): boolean {
  return useContext(DirtyCtx);
}

export function useBuilderHistory(): HistoryFlags {
  const h = useContext(HistoryCtx);
  if (!h) throw new Error('useBuilderHistory must be used inside BuilderStateProvider');
  return h;
}
