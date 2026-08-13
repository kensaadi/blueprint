/**
 * Plans panel — the subscription-tier area at the bottom of the
 * empty-canvas start surface.
 *
 * Layout:
 *   - A green "active plan" banner for the user's CURRENT tier
 *     (Community by default). It's a status indicator, not an action —
 *     no upgrade button.
 *   - Below, one card per UPGRADE option (every tier except the current
 *     one), each showing price + included features + a purchase CTA.
 *
 * This lives in the empty state on purpose: it's the launch surface and
 * disappears the moment the canvas has content (the whole start area is
 * gated on `contract.root === null` in CanvasPanel).
 *
 * SCOPE (Decision #37): this is the SUBSCRIPTION axis — monthly plans
 * that unlock Builder features (via the tier). It is NOT the template
 * marketplace: templates are one-time purchases, priced per template,
 * and never depend on the tier. The two never mix here.
 *
 * Business logic (checkout, license decode, tier detection) is deferred.
 * The CTAs accept optional handlers; wired to no-ops during scaffolding.
 */
import { useCallback, useEffect, useState } from 'react';
import { useLicense, useTier } from '../licensing/LicenseContext';
import { useTierCatalog } from '../licensing/TierCatalogContext';
import type { TierMeta } from '../licensing/tiers';
import { createCheckoutSession, openPortal } from '../api/subscription/service';
import { getStatus } from '../api/license/service';
import type { LicenseStatus } from '../api/license/types';
import { useAlert } from '../primitives/DialogFlow';
import { PRICING_URL } from '../licensing/pricing';

/** Enterprise sales inbox (Contact sales CTA opens a mail draft here). */
const SALES_EMAIL = 'info@dashforge-ui.com';

/** Format an ISO date as a short, locale-aware label (e.g. "Dec 31, 2027"). */
function formatDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  return new Date(t).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type PlansPanelProps = {
  /** Fires when a self-serve (Stripe) tier's Buy button is clicked. */
  onBuy?: (tierId: TierMeta['id']) => void;
  /** Fires for the Enterprise "Contact sales" CTA. */
  onContact?: () => void;
};

function UpgradeCard({
  tier,
  onBuy,
  onContact,
}: {
  tier: TierMeta;
  onBuy?: (tierId: TierMeta['id']) => void;
  onContact?: () => void;
}) {
  return (
    <div
      className="flex w-[176px] flex-none flex-col rounded-xl p-4"
      style={{ border: '1px solid var(--bd-border)', background: 'var(--bd-panel)' }}
    >
      <span className="text-[14px] font-semibold" style={{ color: 'var(--bd-text)' }}>
        {tier.label}
      </span>
      <div className="mb-3 mt-1 text-[20px] font-semibold" style={{ color: 'var(--bd-text)' }}>
        {tier.priceLabel}
      </div>

      <ul className="flex-1 space-y-[6px] text-[11px]" style={{ color: 'var(--bd-text)' }}>
        {tier.highlights.map((h) => (
          <li key={h} className="flex items-start gap-[6px]">
            <i
              className="ti ti-check mt-[1px] text-[14px]"
              style={{ color: 'var(--bd-success)' }}
              aria-hidden
            />
            <span>{h}</span>
          </li>
        ))}
        {tier.note && (
          <li className="pt-[2px] text-[10px]" style={{ color: 'var(--bd-text-faint)' }}>
            {tier.note}
          </li>
        )}
      </ul>

      <div className="mt-3">
        {tier.cta === 'contact' ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onContact?.();
            }}
            className="flex w-full cursor-pointer items-center justify-center gap-[5px] rounded-lg border py-[7px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97]"
            style={{
              borderColor: 'var(--bd-border-strong)',
              color: 'var(--bd-text)',
              background: 'transparent',
            }}
          >
            <i className="ti ti-mail text-[14px]" aria-hidden />
            Contact sales
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBuy?.(tier.id);
            }}
            className="w-full cursor-pointer rounded-lg py-[7px] text-[12px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97]"
            style={{
              background: 'var(--bd-accent-bg)',
              color: 'var(--bd-accent)',
              border: '1px solid transparent',
            }}
          >
            Buy · {tier.priceLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function PlansPanel({ onBuy, onContact }: PlansPanelProps) {
  const current = useTier();
  const { claims } = useLicense();
  const { tiers, getTierMeta } = useTierCatalog();
  const alert = useAlert();
  const currentMeta = getTierMeta(current);
  const upgradeTiers = tiers.filter((t) => t.id !== current);

  // Authoritative license status (renewal date + revocation) for the
  // active-plan banner — fetched from Foundry, not just read off the
  // offline token, so a revoked license shows correctly.
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const licenseId = claims?.licenseId;
  useEffect(() => {
    if (!licenseId) {
      setStatus(null);
      return;
    }
    let alive = true;
    getStatus(licenseId).then((r) => {
      if (alive && r.data) setStatus(r.data);
    });
    return () => {
      alive = false;
    };
  }, [licenseId]);

  // Open the Stripe billing portal for self-service management (change
  // card, cancel…). Off-Stripe/enterprise licenses have no portal —
  // Foundry answers with an error we surface.
  const handleManage = useCallback(async () => {
    if (!licenseId) return;
    const r = await openPortal(licenseId);
    if (r.error) {
      await alert({ title: 'Billing portal', body: r.error.message });
      return;
    }
    window.location.href = r.data;
  }, [licenseId, alert]);
  // Collapsed by default — the green banner is a slim always-visible
  // summary; the heavier upgrade cards expand only on demand, keeping
  // the start surface uncluttered.
  const [open, setOpen] = useState(false);

  // Default Buy: start a monthly subscription checkout on Foundry and
  // redirect to Stripe's hosted page. Seats come from the tier's minimum
  // (per-seat tiers). The `onBuy` prop overrides this for tests.
  const defaultBuy = useCallback(
    async (tierId: TierMeta['id']) => {
      const tier = tiers.find((t) => t.id === tierId);
      const r = await createCheckoutSession(tierId, tier?.seats ?? 1);
      if (r.error) {
        await alert({ title: 'Checkout error', body: r.error.message });
        return;
      }
      window.location.href = r.data.url;
    },
    [tiers, alert],
  );

  // Default Contact (Enterprise): custom licenses are negotiated off
  // Stripe, so we just point the user at sales.
  const defaultContact = useCallback(() => {
    // Enterprise licenses are negotiated off Stripe — open a mail draft
    // to sales rather than a checkout.
    window.location.href = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
      'Enterprise plan inquiry',
    )}`;
  }, []);

  const buy = onBuy ?? defaultBuy;
  const contact = onContact ?? defaultContact;

  // The active tier should always resolve (Community is in both the
  // fallback ladder and the Foundry catalog); guard defensively so a
  // malformed catalog can't crash the start surface.
  if (!currentMeta) return null;

  return (
    <section className="mb-6" aria-label="Subscription plans">
      {/* Active-plan banner — green, and doubles as the collapse toggle. */}
      <button
        type="button"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left"
        style={{ border: '1px solid var(--bd-success)', background: 'var(--bd-success-bg)' }}
      >
        <div className="flex items-center gap-3">
          <i
            className="ti ti-rosette-discount-check text-[24px]"
            style={{ color: 'var(--bd-success)' }}
            aria-hidden
          />
          <div>
            <div className="text-[14px] font-semibold" style={{ color: 'var(--bd-text)' }}>
              {currentMeta.label} plan
            </div>
            <div className="text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
              {currentMeta.tagline} · your active subscription
            </div>
          </div>
        </div>
        <div className="flex flex-none items-center gap-2">
          <span
            className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium"
            style={{ background: 'var(--bd-panel)', color: 'var(--bd-success)' }}
          >
            <i className="ti ti-check text-[13px]" aria-hidden />
            Active
          </span>
          <i
            className={`ti ti-chevron-${open ? 'up' : 'down'} text-[18px]`}
            style={{ color: 'var(--bd-text-soft)' }}
            aria-hidden
          />
        </div>
      </button>

      {/* Active-license row — renewal date + self-service billing. Only for
          a paid, licensed tier (Community has no license). */}
      {claims && (
        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[12px]">
          <span style={{ color: 'var(--bd-text-soft)' }}>
            {status && !status.active
              ? 'Subscription inactive'
              : `Active until ${formatDate(status?.activeUntil ?? claims.activeUntil)}`}
          </span>
          <button
            type="button"
            onClick={handleManage}
            className="inline-flex cursor-pointer items-center gap-1 font-medium transition hover:opacity-80"
            style={{ color: 'var(--bd-accent)' }}
          >
            Manage subscription
            <i className="ti ti-external-link text-[12px]" aria-hidden />
          </button>
        </div>
      )}

      {/* Upgrade options — every tier except the current one. Collapsed by default. */}
      {open && upgradeTiers.length > 0 && (
        <>
          <div className="mb-3 mt-6 flex items-baseline justify-between">
            <span
              className="text-[12px] font-medium uppercase tracking-[0.1em]"
              style={{ color: 'var(--bd-text-faint)' }}
            >
              Upgrade options
            </span>
            <a
              href={PRICING_URL}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[12px] font-medium transition hover:opacity-80"
              style={{ color: 'var(--bd-accent)' }}
            >
              Compare all plans
              <i className="ti ti-external-link text-[12px]" aria-hidden />
            </a>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {upgradeTiers.map((tier) => (
              <UpgradeCard key={tier.id} tier={tier} onBuy={buy} onContact={contact} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
