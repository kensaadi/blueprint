/**
 * Marketplace carousel — a self-scrolling teaser of marketplace templates
 * shown in the empty-canvas start area, above the plans panel.
 *
 * It "travels on its own": the track is duplicated and animated with a
 * CSS marquee (`.bd-marquee` in tokens.css) so ~3 cards are visible and
 * slide continuously. Hovering pauses it (so a card is clickable), and
 * `prefers-reduced-motion` stops it entirely.
 *
 * The "Go to Marketplace →" link (right-aligned) and the cards both call
 * `openMarketplace()` (from the tab context) — the full catalog with
 * filters lives in the Marketplace tab. Prices are one-time, per
 * template, the same for every tier (Decision #37) — never a subscription.
 */
import { MARKETPLACE_TEMPLATES } from '../marketplace/catalog';
import { isFreeTemplate, priceLabel, type MarketplaceTemplate } from '../marketplace/types';
import { useMarketplaceTab } from '../state/MarketplaceTabContext';

function CarouselCard({
  t,
  onOpen,
  ariaHidden,
}: {
  t: MarketplaceTemplate;
  onOpen?: () => void;
  ariaHidden?: boolean;
}) {
  const free = isFreeTemplate(t);
  return (
    <button
      type="button"
      aria-hidden={ariaHidden}
      tabIndex={ariaHidden ? -1 : 0}
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.();
      }}
      className="bd-item mr-3 flex w-[200px] flex-none flex-col items-start rounded-xl p-3 text-left"
    >
      <div className="flex w-full items-start justify-between">
        <i
          className={`ti ti-${t.icon} text-[18px]`}
          style={{ color: 'var(--bd-accent)' }}
          aria-hidden
        />
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
      </div>
      <span className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--bd-text)' }}>
        {t.name}
      </span>
      <span className="mt-[2px] text-[11px]" style={{ color: 'var(--bd-text-soft)' }}>
        {t.description}
      </span>
    </button>
  );
}

export function MarketplaceCarousel() {
  const { openMarketplace } = useMarketplaceTab();
  // Duplicate the list so the marquee loops seamlessly (translateX(-50%)
  // lands exactly one copy over — see `.bd-marquee` in tokens.css).
  const loop = [...MARKETPLACE_TEMPLATES, ...MARKETPLACE_TEMPLATES];
  const n = MARKETPLACE_TEMPLATES.length;

  return (
    <section className="mt-8" aria-label="Marketplace templates">
      <div className="mb-3 flex items-baseline justify-between">
        <span
          className="text-[12px] font-medium uppercase tracking-[0.1em]"
          style={{ color: 'var(--bd-text-faint)' }}
        >
          From the marketplace
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openMarketplace();
          }}
          className="flex items-center gap-1 text-[12px] font-medium"
          style={{ color: 'var(--bd-accent)' }}
        >
          Go to Marketplace
          <i className="ti ti-arrow-right text-[14px]" aria-hidden />
        </button>
      </div>

      <div
        className="overflow-hidden"
        style={{
          WebkitMaskImage:
            'linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)',
          maskImage:
            'linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)',
        }}
      >
        <div className="bd-marquee flex w-max">
          {loop.map((t, i) => (
            <CarouselCard
              key={`${t.id}-${i}`}
              t={t}
              onOpen={openMarketplace}
              ariaHidden={i >= n}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
