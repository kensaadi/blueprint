/**
 * Most-recently-used command tracker for the palette.
 *
 * The palette shows a "Recent" section on top when the user opens it
 * without typing — same shape Raycast / Linear / VSCode use. We keep
 * a short capped list of command IDs in localStorage, most-recent
 * first, deduplicated on every push.
 *
 * IDs are the same strings the palette assigns to each command (e.g.
 * `action.save`, `add.button`, `template.login`). We don't store
 * labels or handlers — the palette resolves each ID against its
 * current command pool at render time, so stale entries (a command
 * that no longer exists, or a Navigate row for a node that's since
 * been deleted) simply disappear without any migration.
 */

const KEY = 'builder-v2:palette:recents:v1';
const MAX = 8;

/**
 * Skip prefixes — IDs that start with any of these are never pushed
 * onto the MRU list. Navigate commands are transient (jumping between
 * nodes is not something you want in a "resume where you left off"
 * list) and templates only make sense the first few times.
 */
const SKIP_PREFIXES = ['nav:'];

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX);
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Storage full or disabled — MRU is a nice-to-have, drop silently.
  }
}

/** Return the current MRU list, most-recent first. */
export function listRecents(limit: number = MAX): string[] {
  return read().slice(0, limit);
}

/**
 * Bump a command to the top of the MRU list. No-op for commands whose
 * ID starts with a skip prefix.
 */
export function pushRecent(id: string): void {
  if (SKIP_PREFIXES.some((p) => id.startsWith(p))) return;
  const current = read();
  const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX);
  write(next);
}

/** Test hook — wipes the persisted list. Not used by the app. */
export function clearRecents(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // no-op
  }
}
