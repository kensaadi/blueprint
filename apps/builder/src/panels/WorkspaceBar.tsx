/**
 * Workspace connect bar — sign in to the customer's self-hosted Workspace
 * Service, the authoritative source of the plan's entitlements.
 *
 * Shown only when a Workspace Service is configured (`HAS_WORKSPACE`). On
 * sign-in the session is stored and the LicenseContext re-reads the
 * WS-enforced license (`syncWorkspace`), so tier + features become
 * authoritative (server-enforced), outranking any offline token. Without
 * a workspace the Builder stays local-only and this bar never renders.
 *
 * The WS URL is per-deployment config (env), not user input — the form
 * asks only for email + password. The first account created is the owner.
 */
import { useState } from 'react';
import { HAS_WORKSPACE } from '../api/_shared/config';
import { useLicense } from '../licensing/LicenseContext';
import { login, register } from '../api/workspace/service';
import { loadSession, sessionToken } from '../api/workspace/session';

export function WorkspaceBar() {
  const { syncWorkspace, disconnectWorkspace } = useLicense();
  const [connected, setConnected] = useState(() => sessionToken() !== null);
  const [email, setEmail] = useState(() => loadSession()?.user.email ?? '');
  const [password, setPassword] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!HAS_WORKSPACE) return null;

  async function submit(mode: 'login' | 'register') {
    setBusy(true);
    setError(null);
    const call = mode === 'login' ? login : register;
    const r = await call(email.trim(), password);
    setBusy(false);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    setPassword('');
    setOpen(false);
    setConnected(true);
    await syncWorkspace();
  }

  function disconnect() {
    disconnectWorkspace();
    setConnected(false);
    setPassword('');
  }

  return (
    <section
      className="mt-8 rounded-xl border px-4 py-3"
      style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-panel)' }}
      aria-label="Workspace connection"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <i
            className={`ti ti-${connected ? 'cloud-check' : 'cloud'} text-[20px]`}
            style={{ color: connected ? 'var(--bd-success)' : 'var(--bd-accent)' }}
            aria-hidden
          />
          <div>
            <div className="text-[13px] font-semibold" style={{ color: 'var(--bd-text)' }}>
              {connected ? 'Workspace connected' : 'Connect your workspace'}
            </div>
            <div className="text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
              {connected
                ? `Signed in as ${loadSession()?.user.email ?? ''} · your plan is enforced here`
                : 'Sign in to your team workspace to activate your plan.'}
            </div>
          </div>
        </div>
        {connected ? (
          <button
            type="button"
            onClick={disconnect}
            className="flex flex-none cursor-pointer items-center gap-[6px] rounded-lg border px-[14px] py-[7px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97]"
            style={{ borderColor: 'var(--bd-border-strong)', color: 'var(--bd-text)' }}
          >
            <i className="ti ti-logout text-[14px]" aria-hidden />
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex flex-none cursor-pointer items-center gap-[6px] rounded-lg px-[14px] py-[7px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97]"
            style={{ background: 'var(--bd-accent-bg)', color: 'var(--bd-accent)' }}
          >
            <i className="ti ti-plug text-[14px]" aria-hidden />
            Connect
          </button>
        )}
      </div>

      {!connected && open && (
        <form
          className="mt-3 flex flex-col gap-2 border-t pt-3"
          style={{ borderColor: 'var(--bd-border)' }}
          onSubmit={(e) => {
            e.preventDefault();
            void submit('login');
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none"
              style={{
                borderColor: 'var(--bd-border-strong)',
                background: 'var(--bd-surface, var(--bd-item))',
                color: 'var(--bd-text)',
              }}
            />
            <input
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none"
              style={{
                borderColor: 'var(--bd-border-strong)',
                background: 'var(--bd-surface, var(--bd-item))',
                color: 'var(--bd-text)',
              }}
            />
          </div>
          {error && (
            <div className="text-[12px]" style={{ color: 'var(--bd-danger, #dc2626)' }}>
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="cursor-pointer rounded-lg px-4 py-[7px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
              style={{ background: 'var(--bd-accent)', color: 'var(--bd-accent-fg)' }}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit('register')}
              className="cursor-pointer rounded-lg border px-4 py-[7px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
              style={{ borderColor: 'var(--bd-border-strong)', color: 'var(--bd-text)' }}
            >
              Create workspace
            </button>
            <span className="text-[11px]" style={{ color: 'var(--bd-text-faint)' }}>
              First time? Create the owner account.
            </span>
          </div>
        </form>
      )}
    </section>
  );
}
