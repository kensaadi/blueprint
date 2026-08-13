/**
 * Plan badge — a persistent, always-visible indicator of the user's
 * current subscription tier in the header. The PlansPanel banner only
 * shows on the empty-canvas home; this makes the active plan visible at
 * all times (so a user knows, after subscribing, that it went through).
 *
 * Reads the authoritative tier from LicenseContext (WS-enforced when
 * connected, offline token otherwise). Clicking opens the plans page.
 */
import { useTier } from '../licensing/LicenseContext';
import { PRICING_URL } from '../licensing/pricing';

const LABEL: Record<string, string> = {
  community: 'Community',
  pro: 'Pro',
  team: 'Team',
  business: 'Business',
  enterprise: 'Enterprise',
};

export function PlanBadge() {
  const tier = useTier();
  const paid = tier !== 'community';
  return (
    <a
      href={PRICING_URL}
      target="_blank"
      rel="noreferrer"
      title={`Your plan: ${LABEL[tier] ?? tier}`}
      className="flex flex-none items-center gap-[5px] rounded-md px-2 py-1 text-[12px] font-medium transition duration-100 hover:opacity-90"
      style={{
        color: paid ? 'var(--bd-success)' : 'var(--bd-text-soft)',
        background: paid ? 'var(--bd-success-bg)' : 'transparent',
      }}
    >
      <i
        className={`ti ti-${paid ? 'rosette-discount-check' : 'user'} text-[14px]`}
        aria-hidden
      />
      {LABEL[tier] ?? tier}
    </a>
  );
}
