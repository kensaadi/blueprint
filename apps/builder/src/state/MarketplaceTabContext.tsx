/**
 * Marketplace tab state — which workspace view the center area shows.
 *
 * The center area behaves like a small tab strip: the "Dashboard" tab is
 * the editor/start surface (always available); the "Marketplace" tab is
 * opened on demand from the carousel's "Go to Marketplace →" link (or a
 * card) and can be closed with its ×.
 *
 *   openMarketplace()  → create the Marketplace tab and focus it
 *   showDashboard()    → focus Dashboard, keep the Marketplace tab
 *   showMarketplace()  → focus the (existing) Marketplace tab
 *   closeMarketplace() → remove the Marketplace tab, back to Dashboard
 *
 * `open` = the Marketplace tab exists; `active` = which tab is focused.
 * The tab strip renders only while `open` is true, so ordinary editing
 * keeps a clean, chrome-free canvas.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ActiveTab = 'dashboard' | 'marketplace';

type MarketplaceTabState = {
  open: boolean;
  active: ActiveTab;
  openMarketplace: () => void;
  showDashboard: () => void;
  showMarketplace: () => void;
  closeMarketplace: () => void;
};

const Ctx = createContext<MarketplaceTabState | null>(null);

export function MarketplaceTabProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ActiveTab>('dashboard');

  const openMarketplace = useCallback(() => {
    setOpen(true);
    setActive('marketplace');
  }, []);
  const showDashboard = useCallback(() => setActive('dashboard'), []);
  const showMarketplace = useCallback(() => setActive('marketplace'), []);
  const closeMarketplace = useCallback(() => {
    setOpen(false);
    setActive('dashboard');
  }, []);

  const value = useMemo<MarketplaceTabState>(
    () => ({
      open,
      active,
      openMarketplace,
      showDashboard,
      showMarketplace,
      closeMarketplace,
    }),
    [open, active, openMarketplace, showDashboard, showMarketplace, closeMarketplace],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMarketplaceTab(): MarketplaceTabState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMarketplaceTab must be used within MarketplaceTabProvider');
  return v;
}
