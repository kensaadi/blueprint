/**
 * License bar — the always-visible "Enter license" entry point at the
 * bottom of the empty-canvas start area.
 *
 * Deliberately detached from the (collapsible) plans panel: a user who
 * bought a plan must always find where to paste their key, even with the
 * plans section collapsed. So this sits on its own, never hidden.
 *
 * The default action opens a paste dialog, verifies the token offline
 * against the pinned Foundry key, and activates it. `onEnterLicense`
 * overrides this (e.g. for tests).
 */
import { useCallback } from 'react';
import { useLicense } from '../licensing/LicenseContext';
import { useAlert, usePrompt } from '../primitives/DialogFlow';

export function LicenseBar({ onEnterLicense }: { onEnterLicense?: () => void }) {
  const { activate } = useLicense();
  const prompt = usePrompt();
  const alert = useAlert();

  const defaultEnter = useCallback(async () => {
    const token = await prompt({
      title: 'Enter license',
      label: 'License token',
      placeholder: 'Paste your license key…',
      confirmLabel: 'Activate',
    });
    if (!token) return;
    const ok = await activate(token.trim());
    await alert(
      ok
        ? { title: 'License activated', body: 'Your plan is now active.' }
        : {
            title: 'Invalid license',
            body: 'That license key could not be verified.',
          },
    );
  }, [prompt, alert, activate]);

  const handleEnter = onEnterLicense ?? defaultEnter;

  return (
    <section
      className="mt-8 flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
      style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-panel)' }}
      aria-label="License activation"
    >
      <div className="flex items-center gap-3">
        <i
          className="ti ti-key text-[20px]"
          style={{ color: 'var(--bd-accent)' }}
          aria-hidden
        />
        <div>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--bd-text)' }}>
            Have a license key?
          </div>
          <div className="text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
            Activate a paid plan you already purchased.
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleEnter();
        }}
        className="flex flex-none items-center gap-[6px] rounded-lg px-[14px] py-[7px] text-[12px] font-medium transition-colors"
        style={{ background: 'var(--bd-accent-bg)', color: 'var(--bd-accent)' }}
      >
        <i className="ti ti-key text-[14px]" aria-hidden />
        Enter license
      </button>
    </section>
  );
}
