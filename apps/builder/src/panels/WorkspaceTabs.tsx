/**
 * Workspace tab strip — sits atop the center area. Renders only while a
 * Marketplace tab is open; ordinary editing keeps a chrome-free canvas.
 *
 * "Dashboard" is permanent (returns to the editor/start surface);
 * "Marketplace" is closable via its ×.
 */
import { useMarketplaceTab } from '../state/MarketplaceTabContext';

function Tab({
  label,
  icon,
  active,
  onClick,
  onClose,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
  onClose?: () => void;
}) {
  return (
    <div
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2 rounded-t-lg border border-b-0 px-3.5 py-2 text-[13px] font-medium"
      style={{
        borderColor: 'var(--bd-border)',
        background: active ? 'var(--bd-canvas)' : 'transparent',
        color: active ? 'var(--bd-text)' : 'var(--bd-text-soft)',
        // Pull the active tab down 1px so it visually merges with the
        // canvas below, hiding the strip's bottom border under it.
        marginBottom: active ? '-1px' : 0,
      }}
    >
      <i
        className={`ti ti-${icon} text-[16px]`}
        style={{ color: active ? 'var(--bd-accent)' : 'var(--bd-text-soft)' }}
        aria-hidden
      />
      {label}
      {onClose && (
        <i
          role="button"
          aria-label="Close marketplace"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ti ti-x ml-1 rounded p-[2px] text-[15px]"
          style={{ color: 'var(--bd-text-faint)' }}
        />
      )}
    </div>
  );
}

export function WorkspaceTabs() {
  const { open, active, showDashboard, showMarketplace, closeMarketplace } =
    useMarketplaceTab();
  if (!open) return null;

  return (
    <div
      role="tablist"
      aria-label="Workspace tabs"
      className="flex flex-none items-end gap-1 px-3 pt-2"
      style={{ borderBottom: '1px solid var(--bd-border)', background: 'var(--bd-panel)' }}
    >
      <Tab
        label="Dashboard"
        icon="layout-dashboard"
        active={active === 'dashboard'}
        onClick={showDashboard}
      />
      <Tab
        label="Marketplace"
        icon="building-store"
        active={active === 'marketplace'}
        onClick={showMarketplace}
        onClose={closeMarketplace}
      />
    </div>
  );
}
