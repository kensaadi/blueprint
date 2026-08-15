/**
 * Debito #3 regression — a `customNodes.grid` override MUST NOT
 * receive the compiler-injected `_childLayoutHints` prop, because a
 * user-defined React component won't destructure it and React would
 * complain about the unknown DOM prop.
 *
 * `compileNode` computes `gridHints` unconditionally for
 * `type === 'grid'`, but the customNode branch runs before the
 * flavor-registry branch and its `wrap()` call intentionally omits
 * `gridHints`. This test locks that contract.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { DashBlueprint } from '.';
import type { BlueprintDocument } from '@dashforge/blueprint-core';

afterEach(() => cleanup());

describe('customNodes.grid — no compiler-prop leak', () => {
  test('user-defined grid component receives only contract props', () => {
    const seen: Array<Record<string, unknown>> = [];
    const CustomGrid = (props: Record<string, unknown>) => {
      seen.push(props);
      return <div data-testid="custom-grid" />;
    };

    const doc: BlueprintDocument = {
      version: '1.0',
      root: {
        nodeId: 'g',
        type: 'grid',
        props: { cols: 2 },
        children: [
          { nodeId: 'a', type: 'card', props: {}, layoutHint: { size: 6 } },
          { nodeId: 'b', type: 'card', props: {}, layoutHint: { size: 6 } },
        ],
      },
    };

    render(
      <DashBlueprint {...doc} lib="tw" customNodes={{ grid: CustomGrid }} />,
    );

    expect(seen.length).toBeGreaterThanOrEqual(1);
    const props = seen[0];
    // The contract's `cols` reaches the custom component…
    expect(props.cols).toBe(2);
    // …but the compiler-injected hint payload MUST NOT.
    expect(props).not.toHaveProperty('_childLayoutHints');
  });

  test('warn spy sanity: rendering a native grid with hints does NOT trip React unknown-prop warnings', () => {
    // Sibling check: the native TW grid receives `_childLayoutHints` and
    // is expected to destructure it. If a regression forwards it into
    // the DOM, React will warn — we snapshot that no warning fires.
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    const doc: BlueprintDocument = {
      version: '1.0',
      root: {
        nodeId: 'g',
        type: 'grid',
        props: { cols: 12 },
        children: [
          { nodeId: 'a', type: 'card', props: {}, layoutHint: { size: 4 } },
        ],
      },
    };
    render(<DashBlueprint {...doc} lib="tw" />);
    const noUnknownPropWarning = warn.mock.calls.every(
      (call) => !String(call[0] ?? '').includes('_childLayoutHints'),
    );
    warn.mockRestore();
    expect(noUnknownPropWarning).toBe(true);
  });
});
