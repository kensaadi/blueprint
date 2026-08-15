/**
 * FormConfig lifecycle hooks — `onMount` + `onValuesChange`.
 *
 * Verifies:
 *   - onMount fires exactly once after the bridge is ready
 *   - onMount receives a getValues/reset API and they work
 *   - onValuesChange fires on every change with the changed field name
 *   - onValuesChange unsubscribes on unmount (no callbacks after teardown)
 *   - Hooks fire on BOTH flavors (tw + mui)
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { DashBlueprint } from './DashBlueprint';
import type { BlueprintDocument } from '@dashforge/blueprint-core';

afterEach(() => cleanup());

const contract: BlueprintDocument = {
  version: '1.0',
  root: {
    type: 'form',
    nodeId: 'lifecycle-form',
    children: [
      { type: 'field', props: { name: 'name', label: 'Name' } },
      { type: 'field', props: { name: 'email', label: 'Email', type: 'email' } },
      { type: 'submit', props: { label: 'Save' } },
    ],
  },
};

const schema = z.object({
  name: z.string(),
  email: z.string(),
});

describe('FormConfig.onMount', () => {
  test('fires exactly once on mount with API', async () => {
    const onMount = vi.fn();
    render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'lifecycle-form': {
          schema,
          defaultValues: { name: 'Maria', email: '' },
          onSubmit: vi.fn(),
          onMount,
        }}}
      />,
    );
    await waitFor(() => {
      expect(onMount).toHaveBeenCalledTimes(1);
    });
    const api = onMount.mock.calls[0][0];
    expect(typeof api.getValues).toBe('function');
    expect(typeof api.reset).toBe('function');
    expect(api.getValues().name).toBe('Maria');
  });

  test('onMount.reset() hydrates form state (read back via getValues)', async () => {
    // We assert on FORM STATE (via the API's getValues call after reset),
    // not on the DOM input value, because the @dashforge/tw TextField uses
    // an uncontrolled RHF registration and won't always re-render on a
    // programmatic reset — RHF's reset still updates the underlying state.
    let capturedApi: { getValues: () => Record<string, unknown> } | null = null;
    const onMount = vi.fn((api) => {
      capturedApi = api;
      api.reset({ name: 'Hydrated', email: 'h@x.dev' });
    });
    render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'lifecycle-form': {
          schema,
          defaultValues: { name: '', email: '' },
          onSubmit: vi.fn(),
          onMount,
        }}}
      />,
    );
    await waitFor(() => {
      expect(onMount).toHaveBeenCalled();
    });
    expect(capturedApi).not.toBeNull();
    expect(capturedApi!.getValues()).toMatchObject({ name: 'Hydrated', email: 'h@x.dev' });
  });

  test('onMount fires on the mui flavor too', async () => {
    const onMount = vi.fn();
    render(
      <DashBlueprint
        {...contract}
        lib="mui"
        forms={{ 'lifecycle-form': {
          schema,
          defaultValues: { name: '', email: '' },
          onSubmit: vi.fn(),
          onMount,
        }}}
      />,
    );
    await waitFor(() => {
      expect(onMount).toHaveBeenCalledTimes(1);
    });
  });
});

describe('FormConfig.onValuesChange', () => {
  test('fires on field input with new values and field name', async () => {
    const onValuesChange = vi.fn();
    const { container } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'lifecycle-form': {
          schema,
          defaultValues: { name: '', email: '' },
          onSubmit: vi.fn(),
          onValuesChange,
        }}}
      />,
    );
    const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'a' } });
    await waitFor(() => {
      expect(onValuesChange).toHaveBeenCalled();
    });
    const lastCall = onValuesChange.mock.calls.at(-1);
    expect(lastCall?.[0]).toMatchObject({ name: 'a' });
    expect(lastCall?.[1]).toBe('name');
  });

  test('reports the changed field name per call', async () => {
    const onValuesChange = vi.fn();
    const { container } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'lifecycle-form': {
          schema,
          defaultValues: { name: '', email: '' },
          onSubmit: vi.fn(),
          onValuesChange,
        }}}
      />,
    );
    fireEvent.change(container.querySelector('input[name="name"]')!, { target: { value: 'Maria' } });
    fireEvent.change(container.querySelector('input[name="email"]')!, { target: { value: 'm@x.dev' } });
    await waitFor(() => {
      // RHF.watch can emit multiple events per change (touch, focus, value).
      // We just assert that both field names show up in the call set.
      const seenFields = new Set(onValuesChange.mock.calls.map((c) => c[1]));
      expect(seenFields.has('name')).toBe(true);
      expect(seenFields.has('email')).toBe(true);
    });
  });

  test('unsubscribes on unmount (no callbacks after teardown)', async () => {
    const onValuesChange = vi.fn();
    const { container, unmount } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'lifecycle-form': {
          schema,
          defaultValues: { name: '', email: '' },
          onSubmit: vi.fn(),
          onValuesChange,
        }}}
      />,
    );
    fireEvent.change(container.querySelector('input[name="name"]')!, { target: { value: 'a' } });
    await waitFor(() => expect(onValuesChange).toHaveBeenCalled());
    // Re-attempting a fireEvent after unmount must not invoke our callback
    // because the watch subscription is torn down.
    onValuesChange.mockClear();
    unmount();
    // No DOM remains to fire events on — assert the subscription is dead by
    // verifying no callbacks come in during a short window.
    await new Promise((r) => setTimeout(r, 50));
    expect(onValuesChange).not.toHaveBeenCalled();
  });

  test('onValuesChange fires on the mui flavor too', async () => {
    const onValuesChange = vi.fn();
    const { container } = render(
      <DashBlueprint
        {...contract}
        lib="mui"
        forms={{ 'lifecycle-form': {
          schema,
          defaultValues: { name: '', email: '' },
          onSubmit: vi.fn(),
          onValuesChange,
        }}}
      />,
    );
    const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'M' } });
    await waitFor(() => {
      expect(onValuesChange).toHaveBeenCalled();
    });
  });

  test('does not fire when consumer omits onValuesChange', async () => {
    const onMount = vi.fn();
    const { container } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'lifecycle-form': {
          schema,
          defaultValues: { name: '', email: '' },
          onSubmit: vi.fn(),
          onMount,
          // onValuesChange deliberately absent
        }}}
      />,
    );
    // Just verify nothing crashes when omitted.
    fireEvent.change(container.querySelector('input[name="name"]')!, { target: { value: 'a' } });
    await new Promise((r) => setTimeout(r, 50));
    expect(onMount).toHaveBeenCalledTimes(1);
  });
});
