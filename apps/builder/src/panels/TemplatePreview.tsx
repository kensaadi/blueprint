/**
 * Template preview — renders a marketplace template's contract LIVE via
 * the real Blueprint runtime (tw flavor), so the buyer sees the actual
 * UX before purchase. Interactive by default (fields, visibility rules);
 * the form never really submits — it's a preview.
 *
 * This module is the ONLY place that imports `@dashforge/blueprint`
 * (which transitively pulls the flavor packs incl. MUI). It is meant to
 * be `React.lazy()`-loaded from the detail modal so that weight lands in
 * an on-demand chunk, never in the Builder's first load. Default export
 * for exactly that reason.
 *
 * Wrapped in a local error boundary: a malformed contract degrades to a
 * message, it never takes down the modal.
 */
import { Component, type ReactNode } from 'react';
import { DashBlueprint } from '@dashforge/blueprint';
import type { BlueprintNode } from '@dashforge/blueprint-core';
import type { Contract } from '../state/types';
import { tablerIconRegistry } from '../data/tablerIconRegistry';

class PreviewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="p-6 text-center text-[13px]" style={{ color: 'var(--bd-text-faint)' }}>
          <i className="ti ti-alert-triangle mb-1 block text-[20px]" aria-hidden />
          This template couldn't be previewed.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function TemplatePreview({
  contract,
  maxHeightVh = 60,
}: {
  contract: Contract;
  /** Cap the preview's own scroll height — smaller in the modal, taller
   *  on the full canvas. */
  maxHeightVh?: number;
}) {
  return (
    <PreviewBoundary>
      {/* White "screen" surface so the rendered UI reads as an app, not
          the Builder chrome. Its own scroll keeps tall pages contained. */}
      <div
        className="overflow-auto rounded-lg bg-white p-5"
        style={{ maxHeight: `${maxHeightVh}vh`, colorScheme: 'light' }}
      >
        <DashBlueprint
          version="1.0"
          lib="tw"
          root={contract.root as unknown as BlueprintNode}
          icons={tablerIconRegistry}
          validationMode="lenient"
        />
      </div>
    </PreviewBoundary>
  );
}
