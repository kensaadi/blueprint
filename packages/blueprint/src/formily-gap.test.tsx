/**
 * Formily-gap audit follow-ups (see FORMILY-GAP-AUDIT.md):
 *
 * #4 — Submit-fail focus management. After a failed submit, focus jumps
 *      to the first invalid field so keyboard users recover without
 *      scanning the form.
 *
 * #8 — `FormMountApi.setValue(name, value)`. Targeted per-field set
 *      without the heavy `reset(allValues)` call.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { DashBlueprint } from './DashBlueprint';
import type { BlueprintDocument } from '@dashforge/blueprint-core';

afterEach(() => cleanup());

const contract: BlueprintDocument = {
  version: '1.0',
  root: {
    type: 'form',
    nodeId: 'gap-form',
    children: [
      { type: 'field', props: { name: 'firstName', label: 'First name', required: true } },
      { type: 'field', props: { name: 'email', label: 'Email', type: 'email', required: true } },
      { type: 'submit', props: { label: 'Save' } },
    ],
  },
};

const schema = z.object({
  firstName: z.string().min(2, 'too short'),
  email: z.string().email('not an email'),
});

describe('Formily-gap #4 — submit-fail focus management', () => {
  test('focus jumps to the first invalid field on submit failure (tw)', async () => {
    const onError = vi.fn();
    const { container } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'gap-form': {
          schema,
          defaultValues: { firstName: '', email: '' },
          onSubmit: vi.fn(),
          onError,
        }}}
      />,
    );

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });

    // First invalid field by registration order = firstName. After
    // RHF's setFocus, document.activeElement should be that input.
    await waitFor(() => {
      const active = document.activeElement;
      expect(active).not.toBeNull();
      expect((active as HTMLInputElement).getAttribute('name')).toBe('firstName');
    });
  });

  test('focus jumps to the second field when only the second is invalid', async () => {
    const onError = vi.fn();
    const { container } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'gap-form': {
          schema,
          defaultValues: { firstName: 'Maria', email: 'not-an-email' },
          onSubmit: vi.fn(),
          onError,
        }}}
      />,
    );

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect((document.activeElement as HTMLInputElement).getAttribute('name')).toBe('email');
    });
  });

  test('mui flavor — submit-fail focus parity', async () => {
    const onError = vi.fn();
    const { container } = render(
      <DashBlueprint
        {...contract}
        lib="mui"
        forms={{ 'gap-form': {
          schema,
          defaultValues: { firstName: '', email: '' },
          onSubmit: vi.fn(),
          onError,
        }}}
      />,
    );

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect((document.activeElement as HTMLInputElement).getAttribute('name')).toBe('firstName');
    });
  });
});

describe('Formily-gap #8 — FormMountApi.setValue', () => {
  test('setValue mutates a single field without resetting the rest', async () => {
    let api: {
      getValues: () => Record<string, unknown>;
      setValue: (n: string, v: unknown) => void;
    } | null = null;

    render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'gap-form': {
          schema,
          defaultValues: { firstName: 'Maria', email: 'maria@x.dev' },
          onSubmit: vi.fn(),
          onMount: (mountApi) => {
            api = mountApi;
            // Simulate a server-side lookup populating one field
            mountApi.setValue('email', 'updated@x.dev');
          },
        }}}
      />,
    );

    await waitFor(() => {
      expect(api).not.toBeNull();
    });

    // Read back via getValues — the OTHER field stays untouched, only
    // email changed. This is the difference vs. `reset(allValues)`.
    expect(api!.getValues()).toMatchObject({
      firstName: 'Maria',         // preserved
      email: 'updated@x.dev',     // mutated
    });
  });

  test('setValue works on mui flavor too', async () => {
    let api: { setValue: (n: string, v: unknown) => void; getValues: () => Record<string, unknown> } | null = null;

    render(
      <DashBlueprint
        {...contract}
        lib="mui"
        forms={{ 'gap-form': {
          schema,
          defaultValues: { firstName: '', email: '' },
          onSubmit: vi.fn(),
          onMount: (mountApi) => {
            api = mountApi;
            mountApi.setValue('firstName', 'Hydrated');
          },
        }}}
      />,
    );

    await waitFor(() => expect(api).not.toBeNull());
    expect(api!.getValues().firstName).toBe('Hydrated');
  });
});
