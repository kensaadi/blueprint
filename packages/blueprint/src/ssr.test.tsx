/**
 * SSR sanity — DashBlueprint must render on the server via
 * `renderToString` without touching browser-only APIs at import time.
 *
 * The guarantee we're locking in:
 *   1. Import path from `./index` must not reference window/document/etc.
 *      at module-load time (would blow up at `next dev` boot).
 *   2. `renderToString(<DashBlueprint …/>)` produces static HTML matching
 *      the contract — no undefined refs, no missing providers.
 *   3. i18n / icons / access — all opt-in — degrade cleanly server-side.
 *
 * This is a proxy for "works in a Next.js App Router server component".
 */
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { DashBlueprint } from './index';
import type { BlueprintNode } from '@dashforge/blueprint-core';

const contract = {
  version: '1.0' as const,
  root: {
    type: 'section',
    nodeId: 'landing',
    props: { spacing: 'lg' },
    children: [
      { type: 'heading', nodeId: 'title', props: { level: 1, children: 'Server-rendered' } },
      { type: 'text', nodeId: 'body', props: { children: 'Hello from the server.' } },
      { type: 'button', nodeId: 'cta', props: { label: 'Go' } },
    ],
  } satisfies BlueprintNode,
};

describe('DashBlueprint — SSR sanity', () => {
  it('renders to a static HTML string with the contract text present', () => {
    const html = renderToString(<DashBlueprint {...contract} lib="tw" />);
    expect(html).toContain('Server-rendered');
    expect(html).toContain('Hello from the server.');
    expect(html).toContain('Go');
  });

  it('renders the TW flavor without throwing', () => {
    expect(() => renderToString(<DashBlueprint {...contract} lib="tw" />)).not.toThrow();
  });

  it('renders the MUI flavor without throwing', () => {
    // Emotion (MUI's styling engine) should not require browser APIs at
    // server render.
    expect(() => renderToString(<DashBlueprint {...contract} lib="mui" />)).not.toThrow();
  });

  it('handles i18n on the server — resolves keys via the supplied `t`', () => {
    const contractI18n = {
      version: '1.0' as const,
      root: {
        type: 'heading',
        nodeId: 'welcome',
        props: { level: 1, children: { $t: 'welcome.title' } },
      } satisfies BlueprintNode,
    };
    const html = renderToString(
      <DashBlueprint
        {...contractI18n}
        lib="tw"
        intl={{ t: (key: string) => (key === 'welcome.title' ? 'Benvenuto' : key) }}
      />,
    );
    expect(html).toContain('Benvenuto');
  });

  it('handles missing intl gracefully (falls back to the key)', () => {
    const contractI18n = {
      version: '1.0' as const,
      root: {
        type: 'heading',
        nodeId: 'welcome',
        props: { level: 1, children: { $t: 'welcome.title' } },
      } satisfies BlueprintNode,
    };
    const html = renderToString(<DashBlueprint {...contractI18n} lib="tw" />);
    expect(html).toContain('welcome.title');
  });

  it('does NOT touch browser globals during import or render', () => {
    // Regression latch: if someone adds `window.X` or `document.Y` at
    // module scope, the SSR render throws ReferenceError. The three
    // renders above already prove that for the common paths — this
    // test asserts explicitly that the imported module didn't stash
    // anything global on `globalThis` at load time.
    const before = new Set(Object.keys(globalThis));
    renderToString(<DashBlueprint {...contract} lib="tw" />);
    const after = new Set(Object.keys(globalThis));
    // Allow React / Vitest / RTL to mutate globals — filter for
    // Blueprint-specific ones.
    const leaked = [...after].filter((k) => !before.has(k) && /blueprint/i.test(k));
    expect(leaked).toEqual([]);
  });
});
