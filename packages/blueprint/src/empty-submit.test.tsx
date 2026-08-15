/**
 * Bug #30 — empty-form submit in jsdom occasionally doesn't fire onInvalid.
 *
 * This test pins the *observable* behavior under jsdom + React 19 + RHF
 * so any regression in jsdom rendering, our compileNode form-wiring, or
 * the `@dashforge/forms` bridge becomes loud.
 *
 * What we assert: submitting an empty contract-driven form with a zod
 * schema that has required `min(1)` fields must call onError (RHF's
 * onInvalid bucket in our FormConfig). If the test stops passing, the
 * jsdom regression or RHF/bridge change has to be investigated.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { DashBlueprint } from './DashBlueprint';
import type { BlueprintDocument } from '@dashforge/blueprint-core';

afterEach(() => cleanup());

const emptyRequiredContract: BlueprintDocument = {
  version: '1.0',
  root: {
    type: 'form',
    nodeId: 'empty-form',
    children: [
      { type: 'field', props: { name: 'firstName', label: 'First name', required: true } },
      { type: 'field', props: { name: 'email', type: 'email', label: 'Email', required: true } },
      { type: 'submit', props: { label: 'Save' } },
    ],
  },
};

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  email: z.string().email('Invalid email'),
});

describe('Bug #30 — empty submit fires onError in jsdom', () => {
  test('clicking submit on an empty form invokes the onError callback', async () => {
    const onSubmit = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <DashBlueprint
        {...emptyRequiredContract}
        lib="tw"
        forms={{
          'empty-form': {
            schema,
            defaultValues: { firstName: '', email: '' },
            mode: 'onSubmit',
            onSubmit,
            onError,
          },
        }}
      />,
    );
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    }, { timeout: 1500 });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('partially-filled form still triggers onError on the remaining empty required fields', async () => {
    const onSubmit = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <DashBlueprint
        {...emptyRequiredContract}
        lib="tw"
        forms={{
          'empty-form': {
            schema,
            defaultValues: { firstName: 'Maria', email: '' },
            mode: 'onSubmit',
            onSubmit,
            onError,
          },
        }}
      />,
    );
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    }, { timeout: 1500 });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('fully valid form fires onSubmit not onError', async () => {
    const onSubmit = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <DashBlueprint
        {...emptyRequiredContract}
        lib="tw"
        forms={{
          'empty-form': {
            schema,
            defaultValues: { firstName: 'Maria', email: 'maria@dashforge.dev' },
            mode: 'onSubmit',
            onSubmit,
            onError,
          },
        }}
      />,
    );
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    }, { timeout: 1500 });
    expect(onError).not.toHaveBeenCalled();
  });
});
