/**
 * Audit panel — the read side of the `audit-log` feature.
 *
 * Shown only when the plan has `audit-log` (Business+) AND the signed-in
 * user is an owner/admin. Lists the most recent security-relevant actions
 * (sign-ins, membership changes, license registration, file mutations)
 * recorded server-side. The Workspace Service is authoritative — it
 * re-checks the feature + admin role on `GET /audit`, so this panel is a
 * convenience surface, not the security boundary.
 */
import { useCallback, useEffect, useState } from 'react';
import { useFeature } from '../licensing/LicenseContext';
import { loadSession, sessionToken } from '../api/workspace/session';
import { listAudit } from '../api/workspace/service';
import type { AuditEvent } from '../api/workspace/types';

/** Icon + human label per action. Unknown actions fall back to the raw key. */
const ACTIONS: Record<string, { icon: string; label: string }> = {
  'auth.login': { icon: 'login-2', label: 'signed in' },
  'auth.join': { icon: 'user-plus', label: 'joined the workspace' },
  'team.invite': { icon: 'mail', label: 'invited' },
  'team.invite_revoke': { icon: 'mail-off', label: 'revoked an invite' },
  'team.role_change': { icon: 'user-cog', label: 'changed a role' },
  'team.member_remove': { icon: 'user-minus', label: 'removed a member' },
  'license.register': { icon: 'certificate', label: 'registered a license' },
  'file.create': { icon: 'file-plus', label: 'created' },
  'file.write': { icon: 'device-floppy', label: 'saved' },
  'file.rename': { icon: 'pencil', label: 'renamed' },
  'file.remove': { icon: 'trash', label: 'deleted' },
  'file.restore': { icon: 'history', label: 'restored' },
  'deploy.publish': { icon: 'rocket', label: 'deployed' },
};

function meta(e: AuditEvent): string {
  const m = e.metadata ?? {};
  const parts: string[] = [];
  if (typeof m.role === 'string') parts.push(m.role);
  if (typeof m.to === 'string') parts.push(`→ ${m.to}`);
  if (typeof m.env === 'string') parts.push(m.env);
  if (typeof m.version === 'number') parts.push(`v${m.version}`);
  if (typeof m.tier === 'string') parts.push(m.tier);
  if (typeof m.seats === 'number') parts.push(`${m.seats} seats`);
  return parts.join(' · ');
}

function when(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export function AuditPanel() {
  const hasAudit = useFeature('audit-log');
  const role = loadSession()?.user.role ?? '';
  const isAdmin = role === 'owner' || role === 'admin';

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const r = await listAudit(50);
    if (r.error) {
      setError(r.error.message);
    } else {
      setEvents(r.data);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (hasAudit && isAdmin && sessionToken()) void refresh();
  }, [hasAudit, isAdmin, refresh]);

  // Self-gate: only Business+ owners/admins see the panel.
  if (!sessionToken() || !hasAudit || !isAdmin) return null;

  return (
    <section
      className="mt-4 rounded-xl border px-4 py-3"
      style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-panel)' }}
      aria-label="Audit log"
    >
      <div className="flex items-center gap-2">
        <i className="ti ti-shield-check text-[18px]" style={{ color: 'var(--bd-accent)' }} aria-hidden />
        <div className="text-[13px] font-semibold" style={{ color: 'var(--bd-text)' }}>
          Audit log
        </div>
        <span className="text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
          {events.length > 0 ? `last ${events.length} events` : ''}
        </span>
        <button
          type="button"
          onClick={() => void refresh()}
          title="Refresh"
          className="ml-auto flex cursor-pointer items-center gap-[4px] rounded-md border px-2 py-[3px] text-[12px] transition duration-100 hover:opacity-90 active:scale-[0.97]"
          style={{ borderColor: 'var(--bd-border-strong)', color: 'var(--bd-text)' }}
        >
          <i className="ti ti-refresh text-[13px]" aria-hidden />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-2 text-[12px]" style={{ color: 'var(--bd-danger, #dc2626)' }}>
          {error}
        </div>
      )}

      <ul
        className="mt-3 flex max-h-64 flex-col gap-[2px] overflow-auto border-t pt-2"
        style={{ borderColor: 'var(--bd-border)' }}
      >
        {events.map((e) => {
          const a = ACTIONS[e.action] ?? { icon: 'point', label: e.action };
          const extra = meta(e);
          // For self-actions (sign in / join) the target repeats the actor —
          // drop it so the line reads "owner@acme.test signed in".
          const target = e.target && e.target !== e.actorEmail ? e.target : '';
          return (
            <li key={e.id} className="flex items-center gap-2 py-[3px] text-[12px]">
              <i
                className={`ti ti-${a.icon} text-[14px]`}
                style={{ color: 'var(--bd-text-soft)' }}
                aria-hidden
              />
              <span className="truncate" style={{ color: 'var(--bd-text)' }}>
                <span className="font-medium">{e.actorEmail || 'someone'}</span> {a.label}
                {target ? <span style={{ color: 'var(--bd-text-soft)' }}> {target}</span> : null}
                {extra ? <span style={{ color: 'var(--bd-text-faint)' }}> ({extra})</span> : null}
              </span>
              <span className="ml-auto flex-none text-[11px]" style={{ color: 'var(--bd-text-faint)' }}>
                {when(e.createdAt)}
              </span>
            </li>
          );
        })}
        {loaded && events.length === 0 && !error && (
          <li className="py-4 text-center text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
            No activity yet.
          </li>
        )}
      </ul>
    </section>
  );
}
