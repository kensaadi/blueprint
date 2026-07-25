/**
 * Center area — the workspace tab strip plus the active view.
 *
 * Sits between the Palette and the Inspector. When the Marketplace tab is
 * focused it swaps the CanvasPanel for the MarketplacePanel; the contract
 * being edited lives in BuilderStateContext, so unmounting CanvasPanel is
 * safe — nothing is lost, and switching back to Dashboard restores it.
 */
import { useMarketplaceTab } from '../state/MarketplaceTabContext';
import { WorkspaceTabs } from './WorkspaceTabs';
import { CanvasView } from './CanvasView';
import { MarketplacePanel } from './MarketplacePanel';

export function CenterArea() {
  const { active } = useMarketplaceTab();
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <WorkspaceTabs />
      {active === 'marketplace' ? <MarketplacePanel /> : <CanvasView />}
    </div>
  );
}
