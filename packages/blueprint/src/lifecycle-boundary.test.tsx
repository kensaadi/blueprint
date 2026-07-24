/**
 * Lifecycle boundary tests — React strict-mode double mount, unmount
 * during pending work, and rapid rerender storms. These are the paths
 * that would produce subtle warnings ("cannot update state on unmounted
 * component", double-fired effects) in a real app if we regressed.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { DashBlueprint } from './DashBlueprint';
import type { BlueprintNode } from '@dashforge/blueprint-core';

afterEach(cleanup);

const simpleContract = {
  version: '1.0' as const,
  root: {
    type: 'stack',
    id: 'root',
    props: { spacing: 'md' },
    children: [
      { type: 'heading', id: 'h', props: { level: 1, children: 'Hello' } },
      { type: 'text', id: 't', props: { children: 'World' } },
    ],
  } satisfies BlueprintNode,
};

describe('React StrictMode double-mount safety', () => {
  it('mounts twice in StrictMode without duplicating diagnostics or crashing', () => {
    const spy = vi.fn();
    render(
      <StrictMode>
        <DashBlueprint {...simpleContract} lib="tw" onValidationDiagnostics={spy} />
      </StrictMode>,
    );
    // StrictMode invokes render + effects twice in dev; the callback
    // still fires (once per unique diagnostics payload since we memo on
    // the JSON key). What matters: no exception, no error render, and
    // no >N invocations that would indicate an unstable dep-array.
    expect(spy).toHaveBeenCalled();
    // Cap on calls so a future regression re-adds an unstable dep and
    // re-fires the effect on every re-render.
    expect(spy.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('renders StrictMode with a form node without invalid-hook errors', () => {
    // Wraps `form` — this is where earlier we saw invalid-hook-call
    // errors from @dashforge components losing their React context.
    const formContract = {
      version: '1.0' as const,
      root: {
        type: 'form',
        id: 'sample',
        props: {},
        children: [
          {
            type: 'field',
            id: 'name',
            props: { name: 'name', label: 'Name', kind: 'text' },
          },
        ],
      } satisfies BlueprintNode,
    };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <StrictMode>
        <DashBlueprint
          {...formContract}
          lib="tw"
          forms={{ sample: { onSubmit: () => {} } }}
        />
      </StrictMode>,
    );
    // Filter: only real React errors, not the expected dev warnings.
    const hookErrors = errorSpy.mock.calls
      .flat()
      .filter((c) =>
        typeof c === 'string' &&
        /Invalid hook call|Rendered fewer hooks|not been rendered inside/.test(c),
      );
    expect(hookErrors).toHaveLength(0);
    errorSpy.mockRestore();
  });
});

describe('Rapid rerender + unmount', () => {
  it('unmount mid-render does not leave dangling console errors', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(<DashBlueprint {...simpleContract} lib="tw" />);
    // Unmount synchronously — the diagnostics effect scheduled in
    // useEffect must NOT setState after unmount. React 19 no longer
    // warns explicitly on that, but the effect cleanup must still run.
    unmount();
    const stateErrors = errorSpy.mock.calls
      .flat()
      .filter((c) => typeof c === 'string' && /unmounted component|Can't perform a React state update/i.test(c));
    expect(stateErrors).toHaveLength(0);
    errorSpy.mockRestore();
  });

  it('rerender with new contract 20× does not exceed a render budget', () => {
    // Each rerender produces a new diagnostics payload (fresh contract
    // reference). The `diagKey` memo dedupes by JSON. What we lock in:
    // 20 rerenders complete under 200ms — proves no unbounded work in
    // the compile path.
    const { rerender } = render(<DashBlueprint {...simpleContract} lib="tw" />);
    const start = performance.now();
    act(() => {
      for (let i = 0; i < 20; i++) {
        rerender(
          <DashBlueprint
            {...simpleContract}
            lib="tw"
            metadata={{ iteration: i }}
          />,
        );
      }
    });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});

describe('Malformed input at the React boundary', () => {
  it('renders a diagnostic panel (not a crash) when passed a non-object contract fragment', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Force a shape that would satisfy TS by casting; simulates a
    // consumer who bypassed types (JSON.parse from a wire).
    const bad = {
      version: '1.0',
      root: 'not a node',
    } as unknown as {
      version: '1.0';
      root: BlueprintNode;
    };
    const { container } = render(<DashBlueprint {...bad} lib="tw" />);
    // Assert the render didn't throw and produced something visible.
    expect(container.textContent).toMatch(/invalid|error/i);
    errorSpy.mockRestore();
  });

  it('renders diagnostic panel when lib is missing', () => {
    // Cast around the required prop so TS lets us omit lib. The runtime
    // guard should catch it and render an inline error.
    const { container } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <DashBlueprint {...simpleContract} {...({} as any)} />,
    );
    expect(container.textContent).toMatch(/requires a flavor|Unknown lib/i);
  });
});
