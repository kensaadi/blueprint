/**
 * Auth gate (Model A) — the self-hosted bundle requires a signed-in session
 * before the Builder is usable, so nobody's work lives only in a browser
 * cache that a clear would wipe. Basic file persistence is free (Community);
 * signing in is the price of never losing your contracts, not a paid feature.
 *
 * Two modes, chosen by the WS's public first-run status:
 *   - `initialized === false` → CREATE the workspace owner (first run).
 *   - `initialized === true`  → SIGN IN (returning owner / invited member).
 *
 * It takes over the whole screen and cannot be dismissed — there is no
 * local-only escape in the bundle. On success the session persists and a
 * reload hands off to the fully signed-in Builder (WorkspaceBar, header badge
 * and the remote-workspace registrar all read the session at mount).
 *
 * Without a Workspace Service (`HAS_WORKSPACE === false`, the dev-only
 * standalone) there is no gate — it renders nothing.
 */
import { useState } from 'react';
import { HAS_WORKSPACE } from '../api/_shared/config';
import { login, register } from '../api/workspace/service';
import { useSignedIn } from '../hooks/useSession';
import { useAuthStatus, invalidateAuthStatus } from '../hooks/useAuthStatus';

function Step({
  n,
  title,
  detail,
}: {
  n: number;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-[10px] px-[2px] py-[6px]">
      <span
        className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[12px] font-medium"
        style={{ border: '1px solid var(--bd-border-strong)', color: 'var(--bd-text-faint)' }}
      >
        {n}
      </span>
      <span className="text-[14px]" style={{ color: 'var(--bd-text-soft)' }}>
        {title}
      </span>
      <span className="ml-auto text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
        {detail}
      </span>
    </div>
  );
}

export function FirstRunOnboarding() {
  const signedIn = useSignedIn();
  const initialized = useAuthStatus();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gate only in the bundle, only while not signed in. `initialized === null`
  // = still probing → render nothing to avoid a flash.
  if (!HAS_WORKSPACE || signedIn || initialized === null) {
    return null;
  }

  const mode: 'create' | 'signin' = initialized ? 'signin' : 'create';

  async function submit() {
    if (mode === 'create' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    const r =
      mode === 'create'
        ? await register(email.trim(), password)
        : await login(email.trim(), password);
    setBusy(false);
    if (r.error) {
      setError(
        r.error.message ||
          (mode === 'signin' ? 'Wrong email or password.' : 'Could not create the workspace.'),
      );
      return;
    }
    invalidateAuthStatus();
    // Session now persists. A reload hands off to the signed-in Builder in one
    // consistent step (siblings read the session at mount).
    window.location.reload();
  }

  const copy =
    mode === 'create'
      ? {
          title: 'Set up your workspace',
          sub: "You're the first here — this bundle runs entirely on your own server.",
          cardTitle: 'Create your workspace',
          cardHint: "you'll be the owner",
          cta: busy ? 'Creating…' : 'Create workspace',
          pwPlaceholder: 'Choose a password (min 8 characters)',
          pwAutocomplete: 'new-password',
        }
      : {
          title: 'Sign in',
          sub: 'Your contracts live on this server — sign in to open them.',
          cardTitle: 'Sign in to your workspace',
          cardHint: 'welcome back',
          cta: busy ? 'Signing in…' : 'Sign in',
          pwPlaceholder: 'Your password',
          pwAutocomplete: 'current-password',
        };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
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
          {copy.title}
        </h1>
        <p className="mb-6 text-[14px] leading-relaxed" style={{ color: 'var(--bd-text-soft)' }}>
          {copy.sub}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="rounded-2xl p-4"
          style={{ border: '2px solid var(--bd-accent)', background: 'var(--bd-panel)' }}
        >
          <div className="mb-3 flex items-center gap-[10px]">
            <span className="text-[15px] font-medium" style={{ color: 'var(--bd-text)' }}>
              {copy.cardTitle}
            </span>
            <span className="ml-auto text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
              {copy.cardHint}
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
              autoComplete={copy.pwAutocomplete}
              required
              placeholder={copy.pwPlaceholder}
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
              {copy.cta}
            </button>
          </div>
        </form>

        {mode === 'create' && (
          <div className="mt-2 px-2">
            <Step n={2} title="Activate a plan" detail="versioning · teams · deploy" />
            <div className="my-[6px] h-px" style={{ background: 'var(--bd-border)' }} />
            <Step n={3} title="Invite your team" detail="share a link · Team plan" />
          </div>
        )}

        <div className="mt-6 flex items-center gap-[6px] text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
          <i className="ti ti-lock text-[13px]" aria-hidden />
          Self-hosted — your contracts never leave this server, and never a cache clear.
        </div>
      </div>
    </div>
  );
}
