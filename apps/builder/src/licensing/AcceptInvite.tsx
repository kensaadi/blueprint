/**
 * Accept-invite handler.
 *
 * A teammate opens the Builder with `?invite=<token>` (the link an admin
 * shared from the Team panel). This component reads the token at mount and,
 * if present, shows a small overlay asking the invitee to set a password.
 * On submit it calls the PUBLIC `POST /auth/accept-invite` (the token is the
 * proof — no prior session), which creates the member and returns a session;
 * we persist it and re-source the WS-enforced license (`syncWorkspace`), so
 * the just-joined user lands connected with their plan active.
 *
 * The Builder has no router, so — like CheckoutReturn — this reads the query
 * at the app root and cleans the URL immediately so a reload doesn't reprompt.
 *
 * Mounted inside the License + DialogFlow providers.
 */
import { useEffect, useRef, useState } from 'react';
import { useLicense } from './LicenseContext';
import { useAlert } from '../primitives/DialogFlow';
import { acceptInvite } from '../api/workspace/service';

/** Strip the `invite` param so a reload doesn't reprocess it. */
function cleanUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

export function AcceptInvite() {
  const { syncWorkspace } = useLicense();
  const alert = useAlert();
  const readRef = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read the token exactly once (ranRef guards StrictMode double-invoke) and
  // clean the URL so it isn't reprocessed on reload.
  useEffect(() => {
    if (readRef.current) return;
    readRef.current = true;
    const invite = new URLSearchParams(window.location.search).get('invite');
    if (!invite) return;
    setToken(invite);
    cleanUrl();
  }, []);

  if (!token) return null;

  async function submit() {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    const r = await acceptInvite(token!, password);
    setBusy(false);
    if (r.error) {
      setError(
        r.error.status === 404
          ? 'This invite link is invalid or has already been used.'
          : r.error.message,
      );
      return;
    }
    setToken(null);
    await syncWorkspace();
    await alert({
      title: 'Welcome to the workspace',
      body: `You've joined as ${r.data.email} (${r.data.role}). Your plan is active.`,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Accept workspace invite"
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-5"
        style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-panel)' }}
      >
        <div className="flex items-center gap-2">
          <i className="ti ti-user-plus text-[20px]" style={{ color: 'var(--bd-accent)' }} aria-hidden />
          <div className="text-[15px] font-semibold" style={{ color: 'var(--bd-text)' }}>
            Join the workspace
          </div>
        </div>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
          You've been invited. Set a password to create your account and join the team.
        </p>
        <form
          className="mt-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <input
            type="password"
            autoComplete="new-password"
            required
            placeholder="Choose a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
            {busy ? 'Joining…' : 'Join workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}
