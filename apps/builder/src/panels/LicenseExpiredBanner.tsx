/**
 * License-expired banner — the read-only-mode signal.
 *
 * Shown as a persistent top strip whenever the registered license is past
 * its `activeUntil` (the WS-enforced JetBrains model: the customer keeps
 * READ-ONLY access — open/export their contracts — but writes are blocked
 * server-side until they renew). This banner tells them WHY a save/deploy
 * fails and where to renew, so they never think their data is lost.
 *
 * Renders nothing when the license is active or under Community.
 */
import { useLicenseExpired } from '../licensing/LicenseContext';
import { PRICING_URL } from '../licensing/pricing';

export function LicenseExpiredBanner() {
  const expired = useLicenseExpired();
  if (!expired) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-[7px] text-center text-[12px]"
      style={{
        background: 'var(--bd-warning-bg, rgba(180,83,9,0.12))',
        color: 'var(--bd-warning, #b45309)',
        borderBottom: '1px solid var(--bd-border)',
      }}
    >
      <span className="inline-flex items-center gap-[6px] font-medium">
        <i className="ti ti-lock-exclamation text-[14px]" aria-hidden />
        License expired · read-only mode
      </span>
      <span style={{ color: 'var(--bd-text-soft)' }}>
        Your contracts are safe and fully readable — renew to start editing again.
      </span>
      <a
        href={PRICING_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-[4px] rounded-md px-3 py-[3px] font-medium transition duration-100 hover:opacity-90"
        style={{ background: 'var(--bd-accent)', color: 'var(--bd-accent-fg)' }}
      >
        Renew
        <i className="ti ti-external-link text-[12px]" aria-hidden />
      </a>
    </div>
  );
}
