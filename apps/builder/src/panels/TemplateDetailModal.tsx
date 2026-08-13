/**
 * Template detail modal — opened from a marketplace card's "View details".
 *
 * Shows title · categories · price, a CTA (Use / Buy €X), and a two-panel
 * body: a LIVE preview of the contract (real Blueprint runtime, tw flavor,
 * lazy-loaded) and a "What's inside" atom breakdown.
 *
 * The template (incl. its contract) is fetched through the marketplace
 * `service` seam — the same call that becomes an HTTP request to the
 * Control Plane later. Access (Use vs Buy) is decided by entitlements —
 * free OR owned — never by the subscription tier (Decision #37).
 */
import { Suspense, lazy, useEffect, useState } from 'react';
import type { MarketplaceTemplate } from '../marketplace/types';
import { CATEGORY_LABEL, isFreeTemplate, priceLabel } from '../marketplace/types';
import { getTemplate } from '../marketplace/service';
import { createCheckoutSession } from '../api/marketplace/service';
import { outlineOf, countByType } from '../marketplace/atomSummary';
import { useEntitlements } from '../licensing/entitlements';
import { useAlert } from '../primitives/DialogFlow';
import { useBuilderDispatch } from '../state/BuilderStateContext';
import { useMarketplaceTab } from '../state/MarketplaceTabContext';

// Lazy so `@dashforge/blueprint` (+ flavor packs) only loads when a modal
// actually opens — never in the Builder's first paint.
const TemplatePreview = lazy(() => import('./TemplatePreview'));

function WhatsInside({ template }: { template: MarketplaceTemplate }) {
  const root = template.contract?.root ?? null;
  const { total, byType } = countByType(root);
  const rows = outlineOf(root);
  return (
    <div>
      <p className="text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
        <span style={{ color: 'var(--bd-text)', fontWeight: 500 }}>{total} atoms</span> · all
        from the closed 36-atom catalog — no hidden code.
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {byType.map(([type, n]) => (
          <span
            key={type}
            className="rounded-full px-2 py-[2px] text-[10px]"
            style={{ background: 'var(--bd-item)', color: 'var(--bd-text-soft)' }}
          >
            {type}{n > 1 ? ` ×${n}` : ''}
          </span>
        ))}
      </div>
      <div
        className="mt-3 max-h-[38vh] overflow-auto rounded-lg border p-3 font-mono text-[11px] leading-[1.7]"
        style={{ borderColor: 'var(--bd-border)', color: 'var(--bd-text)' }}
      >
        {rows.map((r, i) => (
          <div key={i} style={{ paddingLeft: `${r.depth * 12}px`, color: 'var(--bd-text-soft)' }}>
            <span style={{ color: 'var(--bd-accent)' }}>{r.type}</span>
            {r.label ? <span style={{ color: 'var(--bd-text-faint)' }}> · {r.label}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TemplateDetailModal({
  templateId,
  onClose,
}: {
  templateId: string | null;
  onClose: () => void;
}) {
  const [template, setTemplate] = useState<MarketplaceTemplate | null>(null);
  const { canUse } = useEntitlements();
  const alert = useAlert();
  const dispatch = useBuilderDispatch();
  const { closeMarketplace } = useMarketplaceTab();

  // Fetch the full detail (incl. contract) when a template is selected.
  useEffect(() => {
    let alive = true;
    if (!templateId) {
      setTemplate(null);
      return;
    }
    getTemplate(templateId).then((t) => {
      if (alive) setTemplate(t ?? null);
    });
    return () => {
      alive = false;
    };
  }, [templateId]);

  // Escape closes.
  useEffect(() => {
    if (!templateId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [templateId, onClose]);

  if (!templateId) return null;

  const free = template ? isFreeTemplate(template) : false;
  const usable = template ? canUse({ id: template.id, free }) : false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Template details"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border"
        style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-panel)' }}
      >
        {!template ? (
          <div className="p-10 text-center text-[13px]" style={{ color: 'var(--bd-text-faint)' }}>
            Loading…
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              className="flex items-start justify-between gap-3 border-b p-5"
              style={{ borderColor: 'var(--bd-border)' }}
            >
              <div className="flex items-start gap-3">
                <i
                  className={`ti ti-${template.icon} text-[24px]`}
                  style={{ color: 'var(--bd-accent)' }}
                  aria-hidden
                />
                <div>
                  <div className="text-[16px] font-semibold" style={{ color: 'var(--bd-text)' }}>
                    {template.name}
                  </div>
                  <div className="text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
                    {template.description}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {template.categories.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border px-2 py-[2px] text-[10px]"
                        style={{ borderColor: 'var(--bd-border)', color: 'var(--bd-text-soft)' }}
                      >
                        {CATEGORY_LABEL[c]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-none items-center gap-3">
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={
                    usable
                      ? { background: 'var(--bd-success-bg)', color: 'var(--bd-success)' }
                      : { background: 'var(--bd-accent-bg)', color: 'var(--bd-accent)' }
                  }
                >
                  {usable && !free ? 'Owned' : priceLabel(template)}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-md p-1 text-[18px]"
                  style={{ color: 'var(--bd-text-soft)' }}
                >
                  <i className="ti ti-x" aria-hidden />
                </button>
              </div>
            </div>

            {/* Body: preview | what's inside */}
            <div className="grid flex-1 gap-5 overflow-auto p-5 md:grid-cols-[3fr_2fr]">
              <div>
                <p
                  className="mb-2 text-[11px] uppercase tracking-[0.08em]"
                  style={{ color: 'var(--bd-text-faint)' }}
                >
                  Live preview
                </p>
                {template.contract ? (
                  <Suspense
                    fallback={
                      <div
                        className="rounded-lg p-10 text-center text-[13px]"
                        style={{ background: 'var(--bd-item)', color: 'var(--bd-text-faint)' }}
                      >
                        Loading preview…
                      </div>
                    }
                  >
                    <TemplatePreview contract={template.contract} />
                  </Suspense>
                ) : (
                  <div
                    className="rounded-lg p-10 text-center text-[13px]"
                    style={{ background: 'var(--bd-item)', color: 'var(--bd-text-faint)' }}
                  >
                    No preview available.
                  </div>
                )}
                <p className="mt-2 text-[11px]" style={{ color: 'var(--bd-text-faint)' }}>
                  <i className="ti ti-info-circle mr-1 align-[-2px]" aria-hidden />
                  Reference preview (Tailwind flavor). On use it adopts your app's design system.
                </p>
              </div>

              <div>
                <p
                  className="mb-2 text-[11px] uppercase tracking-[0.08em]"
                  style={{ color: 'var(--bd-text-faint)' }}
                >
                  What's inside
                </p>
                <WhatsInside template={template} />
              </div>
            </div>

            {/* Footer CTA */}
            <div
              className="flex items-center justify-end gap-3 border-t p-4"
              style={{ borderColor: 'var(--bd-border)' }}
            >
              {usable ? (
                <button
                  type="button"
                  // Load the template's contract into the canvas, then
                  // switch back from the marketplace tab so the user lands
                  // on the freshly-loaded design.
                  onClick={async () => {
                    if (!template.contract) {
                      await alert({
                        title: 'Preview unavailable',
                        body: 'This template could not be loaded. Please try again.',
                      });
                      return;
                    }
                    dispatch({ type: 'replaceContract', contract: template.contract });
                    closeMarketplace();
                    onClose();
                  }}
                  className="cursor-pointer rounded-lg border px-5 py-[9px] text-[13px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97]"
                  style={{ borderColor: 'var(--bd-border-strong)', color: 'var(--bd-text)' }}
                >
                  Use this template
                </button>
              ) : (
                <button
                  type="button"
                  // Start a one-shot Stripe checkout on Foundry and
                  // redirect to the hosted page. Ownership is granted on
                  // return (CheckoutReturn), after the webhook mints the
                  // signed receipt — not optimistically here.
                  onClick={async () => {
                    const r = await createCheckoutSession(template.id);
                    if (r.error) {
                      await alert({ title: 'Checkout error', body: r.error.message });
                      return;
                    }
                    window.location.href = r.data.url;
                  }}
                  className="cursor-pointer rounded-lg px-5 py-[9px] text-[13px] font-medium transition duration-100 hover:opacity-90 active:scale-[0.97]"
                  style={{ background: 'var(--bd-accent)', color: 'var(--bd-accent-fg)' }}
                >
                  Buy {priceLabel(template)}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
