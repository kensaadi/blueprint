/**
 * First-run onboarding (Phase 1) — the self-hosted setup screen.
 *
 * When the bundle is opened for the first time (a Workspace Service is
 * configured, nobody is signed in, and no owner exists yet) this takes over
 * the screen: creating the workspace is the ONLY thing that works until it's
 * done, so we don't bury it in the editor. Step 1 (create the owner account)
 * is the single active action; steps 2–3 are shown as a roadmap so the user
 * knows what's next. "Keep building on Community" dismisses it (local-only).
 *
 * On success the owner is created + signed in → the overlay's own condition
 * (`sessionToken()`) turns false and it disappears, handing off to the normal
 * Builder + the getting-started checklist.
 */
import { useState } from 'react';
import { HAS_WORKSPACE } from '../api/_shared/config';
import { sessionToken } from '../api/workspace/session';
import { register } from '../api/workspace/service';
import { useAuthStatus, invalidateAuthStatus } from '../hooks/useAuthStatus';

const DISMISSED_KEY = 'builder-v2:onboarding-dismissed:v1';

function Step({
  n,
  title,
  detail,
  active,
}: {
  n: number;
  title: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-[10px] px-[2px] py-[6px]">
      <span
        className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[12px] font-medium"
        style={
          active
            ? { background: 'var(--bd-accent)', color: 'var(--bd-accent-fg)' }
            : { border: '1px solid var(--bd-border-strong)', color: 'var(--bd-text-faint)' }
        }
      >
        {n}
      </span>
      <span
        className="text-[14px]"
        style={{ color: active ? 'var(--bd-text)' : 'var(--bd-text-soft)', fontWeight: active ? 500 : 400 }}
      >
        {title}
      </span>
      <span className="ml-auto text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
        {detail}
      </span>
    </div>
  );
}

export function FirstRunOnboarding() {
  const initialized = useAuthStatus();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1',
  );

  // Show ONLY on a genuine first run: bundle mode, not signed in, no owner
  // yet, not dismissed. `initialized === null` = still probing (render
  // nothing to avoid a flash).
  if (
    !HAS_WORKSPACE ||
    sessionToken() ||
    initialized !== false ||
    dismissed
  ) {
    return null;
  }

  async function create() {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    const r = await register(email.trim(), password);
    setBusy(false);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    invalidateAuthStatus();
    // The session now persists in localStorage. A reload hands off to the
    // fully-signed-in Builder in one consistent step — the WorkspaceBar,
    // header badge and getting-started checklist all read the session at
    // mount, and there's no global session signal to re-render those
    // siblings in place. This is a one-time setup moment, so a reload reads
    // as natural rather than jarring.
    window.location.reload();
  }

  function keepCommunity() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Set up your workspace"
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-auto p-6"
      style={{ background: 'var(--bd-canvas)' }}
    >
      <div className="w-full max-w-[460px]">
        <div className="mb-6 flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[14px]"
            style={{ background: 'var(--bd-text)', color: 'var(--bd-canvas)' }}
          >
            <i className="ti ti-layout-grid" aria-hidden />
          </span>
          <span className="text-[14px] font-medium" style={{ color: 'var(--bd-text)' }}>
            Dashforge Builder
          </span>
        </div>

        <h1 className="mb-1 text-[22px] font-medium" style={{ color: 'var(--bd-text)' }}>
          Set up your workspace
        </h1>
        <p className="mb-6 text-[14px] leading-relaxed" style={{ color: 'var(--bd-text-soft)' }}>
          You're the first here — this bundle runs entirely on your own server.
        </p>

        {/* Step 1 — active */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
          className="rounded-2xl p-4"
          style={{ border: '2px solid var(--bd-accent)', background: 'var(--bd-panel)' }}
        >
          <div className="mb-3 flex items-center gap-[10px]">
            <span
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[12px] font-medium"
              style={{ background: 'var(--bd-accent)', color: 'var(--bd-accent-fg)' }}
            >
              1
            </span>
            <span className="text-[15px] font-medium" style={{ color: 'var(--bd-text)' }}>
              Create your workspace
            </span>
            <span className="ml-auto text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
              you'll be the owner
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border px-3 py-2 text-[13px] outline-none"
              style={{
                borderColor: 'var(--bd-border-strong)',
                background: 'var(--bd-surface, var(--bd-item))',
                color: 'var(--bd-text)',
              }}
            />
            <input
              type="password"
              autoComplete="new-password"
              required
              placeholder="Choose a password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border px-3 py-2 text-[13px] outline-none"
              style={{
                borderColor: 'var(--bd-border-strong)',
                background: 'var(--bd-surface, var(--bd-item))',
                color: 'var(--bd-text)',
              }}
            />
            {error && (
              <div className="text-[12px]" style={{ color: 'var(--bd-danger, #dc2626)' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 cursor-pointer rounded-lg px-4 py-[9px] text-[13px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'var(--bd-accent)', color: 'var(--bd-accent-fg)' }}
            >
              {busy ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </form>

        {/* Steps 2–3 — roadmap preview */}
        <div className="mt-2 px-2">
          <Step n={2} title="Activate your plan" detail="remote storage · versioning · teams" />
          <div className="my-[6px] h-px" style={{ background: 'var(--bd-border)' }} />
          <Step n={3} title="Invite your team" detail="share a link · Team plan" />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="flex items-center gap-[6px] text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
            <i className="ti ti-lock text-[13px]" aria-hidden />
            Self-hosted — your contracts never leave this server.
          </span>
          <button
            type="button"
            onClick={keepCommunity}
            className="cursor-pointer text-[12px] font-medium transition hover:opacity-80"
            style={{ color: 'var(--bd-text-soft)' }}
          >
            Keep building on Community
          </button>
        </div>
      </div>
    </div>
  );
}
