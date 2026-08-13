/**
 * Owned-template persistence.
 *
 * Marketplace purchases are one-shot and tier-independent (Decision
 * #37); ownership is just a set of template ids. We persist the ids so a
 * bought template stays "owned" across reloads. The signed receipt lives
 * in Foundry; this local set is the fast-path "do I own it" check.
 */

const OWNED_KEY = 'builder-v2:entitlements:v1';

export function loadOwnedTemplateIds(): string[] {
  try {
    const raw = localStorage.getItem(OWNED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : [];
  } catch {
    return [];
  }
}

export function saveOwnedTemplateIds(ids: readonly string[]): void {
  try {
    localStorage.setItem(OWNED_KEY, JSON.stringify(ids));
  } catch {
    // Private mode / quota — ownership still applies for this session.
  }
}
