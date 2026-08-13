/**
 * Marketplace panel — the full template catalog shown in the Marketplace
 * tab. Filters by price (All / Free / Paid) and category. Each card opens
 * a detail modal (title, categories, price, live preview, atom breakdown)
 * where the Use / Buy action lives.
 *
 * Data comes through the marketplace `service` seam (the future HTTP
 * client). Access is decided by entitlements — free OR owned — never by
 * the subscription tier (Decision #37).
 */
import { useEffect, useMemo, useState } from 'react';
import { getCatalog } from '../marketplace/service';
import { useEntitlements } from '../licensing/entitlements';
import {
  CATEGORY_LABEL,
  isFreeTemplate,
  priceLabel,
  type MarketplaceTemplate,
  type TemplateCategory,
} from '../marketplace/types';
import { TemplateDetailModal } from './TemplateDetailModal';

type PriceFilter = 'all' | 'free' | 'paid';

const CATEGORIES: { id: 'all' | TemplateCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'auth', label: CATEGORY_LABEL.auth },
  { id: 'onboarding', label: CATEGORY_LABEL.onboarding },
  { id: 'commerce', label: CATEGORY_LABEL.commerce },
  { id: 'dashboards', label: CATEGORY_LABEL.dashboards },
  { id: 'marketing', label: CATEGORY_LABEL.marketing },
];

function TemplateCard({
  t,
  owned,
  onOpen,
}: {
  t: MarketplaceTemplate;
  owned: boolean;
  onOpen: (id: string) => void;
}) {
  const free = isFreeTemplate(t);
  return (
    <button
      type="button"
      onClick={() => onOpen(t.id)}
      className="flex flex-col rounded-xl border p-4 text-left transition-colors"
      style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-panel)' }}
    >
      <div className="flex w-full items-start justify-between">
        <i
          className={`ti ti-${t.icon} text-[22px]`}
          style={{ color: 'var(--bd-accent)' }}
          aria-hidden
        />
        {owned && !free ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-medium"
            style={{ background: 'var(--bd-success-bg)', color: 'var(--bd-success)' }}
          >
            <i className="ti ti-check text-[11px]" aria-hidden />
            Owned
          </span>
        ) : (
          <span
            className="rounded-full px-2 py-[2px] text-[10px] font-medium"
            style={
              free
                ? { background: 'var(--bd-success-bg)', color: 'var(--bd-success)' }
                : { background: 'var(--bd-accent-bg)', color: 'var(--bd-accent)' }
            }
          >
            {priceLabel(t)}
          </span>
        )}
      </div>
      <div className="mt-3 text-[14px] font-semibold" style={{ color: 'var(--bd-text)' }}>
        {t.name}
      </div>
      <div className="mb-4 mt-1 flex-1 text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
        {t.description}
      </div>
      <span
        className="inline-flex items-center gap-1 text-[12px] font-medium"
        style={{ color: 'var(--bd-accent)' }}
      >
        View details
        <i className="ti ti-arrow-right text-[14px]" aria-hidden />
      </span>
    </button>
  );
}

export function MarketplacePanel() {
  const [catalog, setCatalog] = useState<MarketplaceTemplate[]>([]);
  const [price, setPrice] = useState<PriceFilter>('all');
  const [category, setCategory] = useState<'all' | TemplateCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { owns } = useEntitlements();

  useEffect(() => {
    let alive = true;
    getCatalog().then((c) => {
      if (alive) setCatalog(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  const items = useMemo(
    () =>
      catalog.filter((t) => {
        const priceOk =
          price === 'all' || (price === 'free' ? isFreeTemplate(t) : !isFreeTemplate(t));
        const catOk = category === 'all' || t.categories.includes(category);
        return priceOk && catOk;
      }),
    [catalog, price, category],
  );

  return (
    <div className="bd-grid flex-1 overflow-y-auto p-8" style={{ background: 'var(--bd-canvas)' }}>
      <div className="mx-auto max-w-4xl">
        <p className="mb-4 text-[12px]" style={{ color: 'var(--bd-text-soft)' }}>
          <i className="ti ti-shopping-bag mr-1 text-[13px] align-[-2px]" aria-hidden />
          One-time purchases — same price for every plan, yours forever. No subscription.
        </p>

        {/* Filters: price segmented control + category chips */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div
            className="flex gap-1 rounded-lg border p-[3px]"
            style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-panel)' }}
          >
            {(['all', 'free', 'paid'] as PriceFilter[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrice(p)}
                className="rounded-md px-3 py-1 text-[12px] font-medium capitalize"
                style={{
                  background: price === p ? 'var(--bd-canvas)' : 'transparent',
                  color: price === p ? 'var(--bd-text)' : 'var(--bd-text-soft)',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-[6px]">
            {CATEGORIES.map((c) => {
              const on = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className="rounded-full border px-3 py-[5px] text-[12px]"
                  style={{
                    borderColor: on ? 'var(--bd-border-strong)' : 'var(--bd-border)',
                    color: on ? 'var(--bd-text)' : 'var(--bd-text-soft)',
                    background: on ? 'var(--bd-item)' : 'transparent',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {items.map((t) => (
              <TemplateCard key={t.id} t={t} owned={owns(t.id)} onOpen={setSelectedId} />
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl border border-dashed p-10 text-center text-[13px]"
            style={{ borderColor: 'var(--bd-border)', color: 'var(--bd-text-faint)' }}
          >
            No templates match this filter.
          </div>
        )}
      </div>

      <TemplateDetailModal templateId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
