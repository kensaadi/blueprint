/**
 * Builder V2 — entry point.
 *
 * Wraps the Builder shell in the Dashforge providers needed for
 * @dashforge/tw + @dashforge/ui components to theme correctly. The
 * Builder UI itself uses Theme A tokens defined in `theme/tokens.css`,
 * but components from `@dashforge/tw` still need their own provider
 * context — using them is the explicit goal here (validate the library
 * by USING it).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DashforgeTailwindProvider } from '@dashforge/tw-theme';
import './index.css';
import './theme/tokens.css';
import { BuilderApp } from './App';
import { LicenseProvider } from './licensing/LicenseContext';
import { EntitlementsProvider } from './licensing/entitlements';

// Scaffolding defaults: no license token → Community tier; no purchased
// templates → empty entitlements. Both are the two orthogonal axes of
// the commercial model (Decision #37) — tier gates Builder features,
// entitlements gate template ownership, and they never cross. The real
// token decode + persisted purchases replace these props later.
createRoot(document.getElementById('builder-root')!).render(
  <StrictMode>
    <DashforgeTailwindProvider>
      <LicenseProvider>
        <EntitlementsProvider>
          <BuilderApp />
        </EntitlementsProvider>
      </LicenseProvider>
    </DashforgeTailwindProvider>
  </StrictMode>,
);
