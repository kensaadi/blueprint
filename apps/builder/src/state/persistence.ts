/**
 * Session persistence — hydrate/persist the working buffer via
 * localStorage so a page refresh doesn't lose the edit-in-progress.
 *
 * Two layers coexist:
 *   1. **Session snapshot** (this file) — auto-saved copy of the
 *      current in-flight buffer PLUS its `fileRef`. Survives refresh
 *      without an explicit Save. Debounced write.
 *   2. **Workspace files** (`workspaces/*`) — named contracts the
 *      user has explicitly saved. Written only on Save / Save-As.
 *
 * Backwards compatibility: the legacy `builder-v2:contract:v1` key
 * (single-contract snapshot) is still read on cold boot so users
 * don't lose their in-flight work across the upgrade. The next write
 * moves the payload to the new session key.
 */
import type {
  Contract,
  BuilderState,
  BlueprintNode,
  FileRef,
} from './types';
import { nodeId } from './factory';

const SESSION_KEY = 'builder-v2:session:v1';
const LEGACY_CONTRACT_KEY = 'builder-v2:contract:v1';

/**
 * Ensure every node in the tree has a stable `id` and a real
 * `children` array. External payloads (imported files, hand-crafted
 * JSON dropped in localStorage, older stored shapes) may omit either;
 * the Builder crashes on `undefined.map` if we don't normalise here.
 */
export function normaliseNode(n: unknown): BlueprintNode | null {
  if (!n || typeof n !== 'object') return null;
  const anyN = n as Record<string, unknown>;
  if (typeof anyN.type !== 'string') return null;
  const kids = Array.isArray(anyN.children) ? anyN.children : [];
  return {
    id: typeof anyN.id === 'string' && anyN.id ? anyN.id : nodeId(),
    type: anyN.type,
    props: (anyN.props && typeof anyN.props === 'object')
      ? (anyN.props as Record<string, unknown>)
      : {},
    children: kids
      .map(normaliseNode)
      .filter((c): c is BlueprintNode => c !== null),
    slots: (anyN.slots as Record<string, unknown>) ?? undefined,
    visibility: anyN.visibility as BlueprintNode['visibility'] ?? undefined,
    disabled: typeof anyN.disabled === 'boolean' ? anyN.disabled : undefined,
    access: (anyN.access as BlueprintNode['access']) ?? undefined,
    layoutHint:
      (anyN.layoutHint as BlueprintNode['layoutHint']) ?? undefined,
  };
}

/** Session snapshot shape written by `persistSession()`. */
type SessionSnapshot = {
  contract: Contract;
  fileRef: FileRef | null;
  /**
   * UI-only: node ids the user has collapsed in the Canvas. Persisted
   * so refreshes / reopens keep the visual state. Never round-trips
   * through the exported contract — pure Builder-side ergonomics.
   */
  collapsedIds?: string[];
};

function parseSnapshot(raw: string): SessionSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as {
      contract?: unknown;
      fileRef?: unknown;
      collapsedIds?: unknown;
    };
    const contract = normaliseContract(obj.contract);
    if (!contract) return null;
    const fileRef =
      obj.fileRef &&
      typeof obj.fileRef === 'object' &&
      typeof (obj.fileRef as FileRef).workspaceId === 'string' &&
      typeof (obj.fileRef as FileRef).fileId === 'string' &&
      typeof (obj.fileRef as FileRef).name === 'string'
        ? (obj.fileRef as FileRef)
        : null;
    const collapsedIds = Array.isArray(obj.collapsedIds)
      ? obj.collapsedIds.filter((s): s is string => typeof s === 'string')
      : undefined;
    return { contract, fileRef, collapsedIds };
  } catch {
    return null;
  }
}

function normaliseContract(raw: unknown): Contract | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof (raw as { version?: unknown }).version !== 'string' ||
    !('root' in raw)
  ) {
    return null;
  }
  const doc = raw as { version: string; root: unknown };
  return {
    version: doc.version,
    root: doc.root === null ? null : normaliseNode(doc.root),
  };
}

/** Restore the previous session (contract + fileRef pointer). */
export function loadSession(): SessionSnapshot | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return parseSnapshot(raw);
  } catch {
    // fall through to legacy path
  }
  // Legacy read: previous versions of the Builder stored the contract
  // alone under a different key. Load it as an untitled buffer.
  try {
    const legacy = localStorage.getItem(LEGACY_CONTRACT_KEY);
    if (!legacy) return null;
    const contract = normaliseContract(JSON.parse(legacy));
    if (!contract) return null;
    return { contract, fileRef: null };
  } catch {
    return null;
  }
}

/** Auto-save writer. Silent on failure. */
export function persistSession(
  contract: Contract,
  fileRef: FileRef | null,
  collapsedIds?: readonly string[],
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload: SessionSnapshot = { contract, fileRef };
    if (collapsedIds && collapsedIds.length > 0) {
      payload.collapsedIds = [...collapsedIds];
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/**
 * Read the persisted collapsed-nodes set. Returns an empty Set if the
 * session snapshot doesn't carry one (backwards-compat).
 */
export function loadCollapsedIds(): Set<string> {
  const snapshot = loadSession();
  return new Set(snapshot?.collapsedIds ?? []);
}

/** Explicit wipe — invoked by the "New contract" command. */
export function clearSession(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_CONTRACT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Build the initial BuilderState from the last session snapshot.
 * Returns `undefined` when nothing is stored — caller falls back to
 * the empty default.
 */
export function initialStateFromStorage(): BuilderState | undefined {
  const restored = loadSession();
  if (!restored) return undefined;
  return {
    contract: restored.contract,
    selectedId: null,
    hoveredId: null,
    fileRef: restored.fileRef,
  };
}

/*
 * Back-compat aliases — some call sites (import flow, "New contract"
 * command) still reference the old function names. Keep them working
 * so the Sprint A change is drop-in.
 */
export function loadPersistedContract(): Contract | null {
  return loadSession()?.contract ?? null;
}
export function persistContract(contract: Contract): void {
  const existing = loadSession();
  persistSession(contract, existing?.fileRef ?? null);
}
export function clearPersistedContract(): void {
  clearSession();
}
