/**
 * License token persistence.
 *
 * The verified Ed25519 token is the license. We store the RAW token
 * (not the decoded claims) so it is re-verified against the pinned key
 * on every boot — a tampered localStorage value simply fails
 * verification and drops the user back to Community. Mirrors the
 * `state/persistence.ts` localStorage convention.
 */

const LICENSE_KEY = 'builder-v2:license:v1';

export function loadLicenseToken(): string | null {
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function saveLicenseToken(token: string): void {
  try {
    localStorage.setItem(LICENSE_KEY, token);
  } catch {
    // Private mode / quota — the token still applies for this session
    // (it lives in React state); it just won't survive a reload.
  }
}

export function clearLicenseToken(): void {
  try {
    localStorage.removeItem(LICENSE_KEY);
  } catch {
    // ignore
  }
}
