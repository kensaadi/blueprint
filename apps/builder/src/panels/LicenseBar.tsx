/**
 * License bar — the always-visible "Enter license" entry point at the
 * bottom of the empty-canvas start area.
 *
 * Deliberately detached from the (collapsible) plans panel: a user who
 * bought a plan must always find where to paste their key, even with the
 * plans section collapsed. So this sits on its own, never hidden.
 *
 * The actual key-entry dialog + offline Ed25519 verification (v2 §7) is
 * deferred; `onEnterLicense` is wired to a no-op during scaffolding.
 */
export function LicenseBar({ onEnterLicense }: { onEnterLicense?: () => void }) {
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
          onEnterLicense?.();
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
