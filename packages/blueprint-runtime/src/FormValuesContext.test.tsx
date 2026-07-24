/**
 * FormValuesContext tests — the graceful "no form in scope" path that
 * InlineText relies on, plus the publisher pushing the RHF snapshot down.
 *
 * `@dashforge/forms` is mocked: we only exercise the contract the
 * publisher depends on (rhf.getValues + rhf.watch → unsubscribe).
 */
import { describe, expect, test, afterEach, vi } from 'vitest';
import { cleanup, render, renderHook } from '@testing-library/react';
import { FormValuesPublisher, useFormValuesSafe } from './FormValuesContext';

let watchCb: ((next: Record<string, unknown>) => void) | null = null;
const unsubscribe = vi.fn();

vi.mock('@dashforge/forms', () => ({
  useDashFormContext: () => ({
    rhf: {
      getValues: () => ({ name: 'Ada' }),
      watch: (cb: (next: Record<string, unknown>) => void) => {
        watchCb = cb;
        return { unsubscribe };
      },
    },
  }),
}));

afterEach(() => {
  cleanup();
  watchCb = null;
  unsubscribe.mockClear();
});

describe('useFormValuesSafe', () => {
  test('returns null when no publisher is in scope', () => {
    const { result } = renderHook(() => useFormValuesSafe());
    expect(result.current).toBeNull();
  });
});

describe('FormValuesPublisher', () => {
  function Probe() {
    const values = useFormValuesSafe();
    return <span data-testid="v">{values ? JSON.stringify(values) : 'none'}</span>;
  }

  test('publishes the initial RHF snapshot', () => {
    const { getByTestId } = render(
      <FormValuesPublisher>
        <Probe />
      </FormValuesPublisher>,
    );
    expect(getByTestId('v').textContent).toBe(JSON.stringify({ name: 'Ada' }));
  });

  test('unsubscribes from watch on unmount', () => {
    const { unmount } = render(
      <FormValuesPublisher>
        <Probe />
      </FormValuesPublisher>,
    );
    expect(watchCb).toBeTypeOf('function');
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
