/**
 * Getting-started checklist (Phase 2) — the light, non-blocking follow-up to
 * the first-run onboarding. Once the owner has created the workspace, this
 * slim card sits at the top of the home and nudges the natural next step:
 * activate a plan (which unlocks the rest). It reuses the panels already on
 * the home — it points at them, it doesn't replace them.
 *
 * Shows only when connected AND still on Community (no paid plan yet). The
 * moment a plan is active the setup goal is met and the card retires; the
 * visible PlansPanel + TeamPanel carry on from there. Dismissible.
 */
import { useState } from 'react';
import { useTier } from '../licensing/LicenseContext';
import { sessionToken } from '../api/workspace/session';

const DISMISSED_KEY = 'builder-v2:getting-started-dismissed:v1';

function Row({
  done,
  title,
  detail,
  informational,
}: {
  done: boolean;
  title: string;
  detail: string;
  informational?: boolean;
}) {
  return (
    <div className="flex items-center gap-[10px] py-[5px]">
      <span
        className="flex h-[20px] w-[20px] flex-none items-center justify-center rounded-full text-[12px]"
        style={
          done
            ? { background: 'var(--bd-success-bg)', color: 'var(--bd-success)' }
            : { border: '1px solid var(--bd-border-strong)', color: 'var(--bd-text-faint)' }
        }
      >
        {done ? <i className="ti ti-check text-[12px]" aria-hidden /> : null}
      </span>
      <span
        className="text-[13px]"
        style={{ color: done ? 'var(--bd-text-soft)' : 'var(--bd-text)', fontWeight: done ? 400 : 500 }}
      >
        {title}
      </span>
      <span className="ml-auto text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
        {informational ? detail : done ? '' : detail}
      </span>
    </div>
  );
}

export function GettingStartedChecklist() {
  const tier = useTier();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1',
  );

  // Connected + still setting up (Community = no plan yet). Retires once a
  // plan is active.
  if (!sessionToken() || tier !== 'community' || dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  return (
    <section
      className="mb-6 rounded-xl border px-4 py-3"
      style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-panel)' }}
      aria-label="Getting started"
    >
      <div className="mb-2 flex items-center gap-2">
        <i className="ti ti-rocket text-[16px]" style={{ color: 'var(--bd-accent)' }} aria-hidden />
        <div className="text-[13px] font-semibold" style={{ color: 'var(--bd-text)' }}>
          Get started
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="ml-auto cursor-pointer rounded-md p-1 text-[15px] transition hover:opacity-70"
          style={{ color: 'var(--bd-text-faint)' }}
        >
          <i className="ti ti-x" aria-hidden />
        </button>
      </div>
      <Row done title="Workspace created" detail="your contracts are saved on this server" />
      <Row
        done={false}
        title="Activate a plan"
        detail="unlock versioning, team seats & deploy — choose a plan below"
      />
      <Row done={false} informational title="Invite your team" detail="available on Team" />
    </section>
  );
}
