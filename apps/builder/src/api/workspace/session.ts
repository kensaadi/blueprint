/**
 * Workspace Service session — the Bearer token + user for the customer's
 * self-hosted authed backend. Persisted in localStorage so a reload keeps
 * the user signed in. This is the FIRST authenticated surface in the
 * Builder (Foundry is auth-less); the token here is a WS session, NOT a
 * Foundry license.
 */

const SESSION_KEY = 'builder-v2:workspace-session:v1';

export type WorkspaceUser = {
  id: string;
  email: string;
  role: string;
};

type StoredSession = {
  token: string;
  user: WorkspaceUser;
};

let cached: StoredSession | null | undefined;

// Reactive layer — so the app can gate on "signed in" and register the remote
// workspace the instant a session appears (login) or vanishes (logout),
// without polling. `cached` is a stable reference between changes, so it
// doubles as a useSyncExternalStore snapshot.
type Listener = () => void;
const listeners = new Set<Listener>();
function notify(): void {
  for (const l of listeners) l();
}

/** Subscribe to session changes (login / logout). Returns an unsubscribe. */
export function subscribeSession(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function loadSession(): StoredSession | null {
  if (cached !== undefined) return cached;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    cached = raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function saveSession(token: string, user: WorkspaceUser): void {
  cached = { token, user };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(cached));
  } catch {
    // private mode / quota — session still applies in-memory this session
  }
  notify();
}

export function clearSession(): void {
  cached = null;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  notify();
}

/** The current Bearer token, or null when not signed in. */
export function sessionToken(): string | null {
  return loadSession()?.token ?? null;
}
