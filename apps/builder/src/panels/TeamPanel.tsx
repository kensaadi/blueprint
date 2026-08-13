/**
 * Team panel — manage workspace members + invites.
 *
 * Shown only when the plan has `shared-workspaces` (Team+) AND the signed-in
 * user is an owner/admin. The Workspace Service is authoritative: it re-checks
 * the feature + the admin role on every call, so this panel is a convenience
 * surface, not the security boundary. A viewer/editor never sees it, and even
 * if they did, the server answers 403.
 *
 * Membership mirrors the JetBrains named-seat model: members + pending invites
 * ≤ licensed seats. An over-cap invite returns `seat_limit` → we surface it.
 */
import { useCallback, useEffect, useState } from 'react';
import { useFeature } from '../licensing/LicenseContext';
import { useConfirm } from '../primitives/DialogFlow';
import { loadSession, sessionToken } from '../api/workspace/session';
import {
  createInvite,
  listInvites,
  listMembers,
  removeMember,
  revokeInvite,
  updateMemberRole,
} from '../api/workspace/service';
import type { Invite, Member } from '../api/workspace/types';

const ASSIGNABLE_ROLES = ['admin', 'editor', 'viewer'] as const;

/** Build the shareable accept-invite link from a token. */
function inviteLink(token: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('invite', token);
  return url.toString();
}

export function TeamPanel() {
  const canManage = useFeature('shared-workspaces');
  const confirm = useConfirm();
  const session = loadSession();
  const myId = session?.user.id ?? '';
  const myRole = session?.user.role ?? '';
  const isAdmin = myRole === 'owner' || myRole === 'admin';

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('editor');
  const [busy, setBusy] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const [m, i] = await Promise.all([listMembers(), listInvites()]);
    if (m.data) setMembers(m.data);
    if (i.data) setInvites(i.data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (canManage && isAdmin && sessionToken()) void refresh();
  }, [canManage, isAdmin, refresh]);

  // Self-gate: only Team+ owners/admins see the panel.
  if (!sessionToken() || !canManage || !isAdmin) return null;

  async function invite() {
    const email = inviteEmail.trim();
    if (!email) return;
    setBusy(true);
    setError(null);
    setLastLink(null);
    const r = await createInvite(email, inviteRole);
    setBusy(false);
    if (r.error) {
      setError(
        r.error.serverCode === 'seat_limit'
          ? 'Seat limit reached — revoke a pending invite or upgrade your plan to add more seats.'
          : r.error.message,
      );
      return;
    }
    setInviteEmail('');
    setLastLink(inviteLink(r.data.token));
    setCopied(false);
    await refresh();
  }

  async function copyLink() {
    if (!lastLink) return;
    try {
      await navigator.clipboard.writeText(lastLink);
      setCopied(true);
    } catch {
      // clipboard blocked — the link is shown for manual copy
    }
  }

  async function changeRole(m: Member, role: string) {
    if (role === m.role) return;
    setError(null);
    const r = await updateMemberRole(m.id, role);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    await refresh();
  }

  async function kick(m: Member) {
    const ok = await confirm({
      title: `Remove ${m.email}?`,
      body: 'They lose access immediately and their session is revoked. This frees a seat.',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    const r = await removeMember(m.id);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    await refresh();
  }

  async function revoke(inv: Invite) {
    const r = await revokeInvite(inv.id);
    if (r.error) {
      setError(r.error.message);
      return;
    }
    await refresh();
  }

  return (
    <section
      className="mt-4 rounded-xl border px-4 py-3"
      style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-panel)' }}
      aria-label="Team members"
    >
      <div className="flex items-center gap-2">
        <i className="ti ti-users text-[18px]" style={{ color: 'var(--bd-accent)' }} aria-hidden />
        <div className="text-[13px] font-semibold" style={{ color: 'var(--bd-text)' }}>
          Team
        </div>
        <span className="text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
          {members.length} member{members.length === 1 ? '' : 's'}
          {invites.length > 0 ? ` · ${invites.length} pending` : ''}
        </span>
      </div>

      {/* Members */}
      <ul className="mt-3 flex flex-col gap-1 border-t pt-3" style={{ borderColor: 'var(--bd-border)' }}>
        {members.map((m) => {
          const isOwner = m.role === 'owner';
          const isSelf = m.id === myId;
          return (
            <li key={m.id} className="flex items-center justify-between gap-2 py-[3px]">
              <span className="truncate text-[13px]" style={{ color: 'var(--bd-text)' }}>
                {m.email}
                {isSelf && (
                  <span className="ml-1 text-[11px]" style={{ color: 'var(--bd-text-faint)' }}>
                    (you)
                  </span>
                )}
              </span>
              <div className="flex flex-none items-center gap-2">
                {isOwner ? (
                  <span
                    className="rounded-md px-2 py-[3px] text-[11px] font-medium"
                    style={{ background: 'var(--bd-accent-bg)', color: 'var(--bd-accent)' }}
                  >
                    owner
                  </span>
                ) : (
                  <select
                    value={m.role}
                    onChange={(e) => void changeRole(m, e.target.value)}
                    className="cursor-pointer rounded-md border px-2 py-[3px] text-[12px] outline-none"
                    style={{
                      borderColor: 'var(--bd-border-strong)',
                      background: 'var(--bd-surface, var(--bd-item))',
                      color: 'var(--bd-text)',
                    }}
                    aria-label={`Role for ${m.email}`}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                )}
                {!isOwner && !isSelf && (
                  <button
                    type="button"
                    onClick={() => void kick(m)}
                    title={`Remove ${m.email}`}
                    className="flex cursor-pointer items-center rounded-md border px-2 py-[3px] text-[12px] transition duration-100 hover:opacity-90 active:scale-[0.97]"
                    style={{ borderColor: 'var(--bd-border-strong)', color: 'var(--bd-danger, #dc2626)' }}
                  >
                    <i className="ti ti-user-minus text-[13px]" aria-hidden />
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {loaded && members.length === 0 && (
          <li className="text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
            No members yet.
          </li>
        )}
      </ul>

      {/* Pending invites */}
      {invites.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 border-t pt-2" style={{ borderColor: 'var(--bd-border)' }}>
          {invites.map((inv) => (
            <li key={inv.id} className="flex items-center justify-between gap-2 py-[3px]">
              <span className="truncate text-[13px]" style={{ color: 'var(--bd-text-soft)' }}>
                <i className="ti ti-mail text-[13px]" aria-hidden /> {inv.email}
                <span className="ml-1 text-[11px]" style={{ color: 'var(--bd-text-faint)' }}>
                  · {inv.role} · pending
                </span>
              </span>
              <button
                type="button"
                onClick={() => void revoke(inv)}
                className="flex flex-none cursor-pointer items-center gap-[4px] rounded-md border px-2 py-[3px] text-[12px] transition duration-100 hover:opacity-90 active:scale-[0.97]"
                style={{ borderColor: 'var(--bd-border-strong)', color: 'var(--bd-text)' }}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Invite form */}
      <form
        className="mt-3 flex flex-col gap-2 border-t pt-3"
        style={{ borderColor: 'var(--bd-border)' }}
        onSubmit={(e) => {
          e.preventDefault();
          void invite();
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            placeholder="teammate@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none"
            style={{
              borderColor: 'var(--bd-border-strong)',
              background: 'var(--bd-surface, var(--bd-item))',
              color: 'var(--bd-text)',
            }}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="cursor-pointer rounded-lg border px-3 py-2 text-[13px] outline-none"
            style={{
              borderColor: 'var(--bd-border-strong)',
              background: 'var(--bd-surface, var(--bd-item))',
              color: 'var(--bd-text)',
            }}
            aria-label="Invite role"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer rounded-lg px-4 py-[7px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
            style={{ background: 'var(--bd-accent)', color: 'var(--bd-accent-fg)' }}
          >
            {busy ? 'Inviting…' : 'Invite'}
          </button>
        </div>
        {error && (
          <div className="text-[12px]" style={{ color: 'var(--bd-danger, #dc2626)' }}>
            {error}
          </div>
        )}
        {lastLink && (
          <div
            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
            style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-surface, var(--bd-item))' }}
          >
            <span className="truncate text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
              Invite link: {lastLink}
            </span>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="flex flex-none cursor-pointer items-center gap-[4px] rounded-md px-2 py-[4px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97]"
              style={{ background: 'var(--bd-accent-bg)', color: 'var(--bd-accent)' }}
            >
              <i className={`ti ti-${copied ? 'check' : 'copy'} text-[13px]`} aria-hidden />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
