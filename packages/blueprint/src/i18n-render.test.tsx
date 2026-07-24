/**
 * Render-side i18n tests — `DashBlueprint` × `intl` prop.
 *
 * Verifies:
 *   - `$t` shorthand resolves at render time
 *   - Inline `$t` variant resolves inside an InlineNode array
 *   - Vars carrying `$form.X` refs reflect current form state
 *   - Switching `t` (locale change) re-renders without crashing
 *   - Missing key (no registry) falls back to the literal key string
 *   - Both flavors (tw + mui) wire the resolver correctly
 */
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { DashBlueprint } from './DashBlueprint';
import type { BlueprintDocument } from '@dashforge/blueprint-core';

afterEach(() => cleanup());

const I18N = {
  it: {
    'common.firstName': 'Nome',
    'common.email': 'Email',
    'actions.save': 'Salva',
    'greeting.name': 'Ciao, {name}!',
  } as Record<string, string>,
  en: {
    'common.firstName': 'First name',
    'common.email': 'Email',
    'actions.save': 'Save',
    'greeting.name': 'Hello, {name}!',
  } as Record<string, string>,
};

function makeT(locale: 'it' | 'en') {
  return (key: string, vars?: Record<string, unknown>): string | undefined => {
    const template = I18N[locale][key];
    if (template === undefined) return undefined;
    return template.replace(/\{(\w+)\}/g, (_, k) => String((vars ?? {})[k] ?? ''));
  };
}

const contract: BlueprintDocument = {
  version: '1.0',
  root: {
    type: 'form',
    id: 'i18n-form',
    children: [
      // shorthand at prop level
      { type: 'field', props: { name: 'firstName', label: { $t: 'common.firstName' } } },
      { type: 'field', props: { name: 'email', label: { $t: 'common.email' }, type: 'email' } },
      // inline array with vars referencing form state
      {
        type: 'heading',
        props: {
          level: 1,
          children: [
            { type: 'text', $t: 'greeting.name', vars: { name: '$form.firstName' } },
          ],
        },
      },
      // submit label
      { type: 'submit', props: { label: { $t: 'actions.save' } } },
    ],
  },
};

const formCfg = {
  schema: z.object({ firstName: z.string(), email: z.string() }),
  defaultValues: { firstName: '', email: '' },
  onSubmit: () => {},
};

describe('intl × DashBlueprint — tw flavor', () => {
  test('resolves $t shorthand at prop level (label + submit)', async () => {
    const { container, getByText } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'i18n-form': formCfg }}
        intl={{ locale: 'it', t: makeT('it') }}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('input[name="firstName"]')).toBeTruthy();
    });
    expect(getByText('Nome')).toBeTruthy();
    expect(getByText('Salva')).toBeTruthy();
  });

  test('resolves inline $t variant inside an InlineNode array', async () => {
    const { getByRole } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'i18n-form': formCfg }}
        intl={{ locale: 'it', t: makeT('it') }}
      />,
    );
    // greeting template has empty name var (form empty) → "Ciao, !"
    await waitFor(() => {
      expect(getByRole('heading').textContent).toMatch(/Ciao/);
    });
  });

  test('vars resolve `$form.X` refs against current form state', async () => {
    const { container, getByRole } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'i18n-form': formCfg }}
        intl={{ locale: 'it', t: makeT('it') }}
      />,
    );
    const firstName = await waitFor(() => {
      const el = container.querySelector('input[name="firstName"]') as HTMLInputElement | null;
      if (!el) throw new Error('field not mounted');
      return el;
    });
    fireEvent.change(firstName, { target: { value: 'Maria' } });
    await waitFor(() => {
      expect(getByRole('heading').textContent).toMatch(/Maria/);
    });
  });

  test('missing key falls back to the literal key (lenient default)', async () => {
    const noopT = () => undefined;
    const { getByText } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'i18n-form': formCfg }}
        intl={{ t: noopT }}
      />,
    );
    await waitFor(() => {
      // Without a translation, the shorthand falls back to the key string.
      expect(getByText('common.firstName')).toBeTruthy();
    });
  });
});

describe('intl × DashBlueprint — mui flavor parity', () => {
  test('resolves $t the same way as tw', async () => {
    const { getByText } = render(
      <DashBlueprint
        {...contract}
        lib="mui"
        forms={{ 'i18n-form': formCfg }}
        intl={{ locale: 'it', t: makeT('it') }}
      />,
    );
    await waitFor(() => {
      expect(getByText('Nome')).toBeTruthy();
      expect(getByText('Salva')).toBeTruthy();
    });
  });
});

describe('intl × DashBlueprint — locale switching', () => {
  function Wrapper({ locale }: { locale: 'it' | 'en' }) {
    return (
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'i18n-form': formCfg }}
        intl={{ locale, t: makeT(locale) }}
      />
    );
  }

  test('rerenders translated text when t changes identity', async () => {
    const { rerender, getByText, queryByText } = render(<Wrapper locale="it" />);
    await waitFor(() => expect(getByText('Nome')).toBeTruthy());

    rerender(<Wrapper locale="en" />);
    await waitFor(() => expect(getByText('First name')).toBeTruthy());
    expect(queryByText('Nome')).toBeNull();
  });
});

describe('intl × DashBlueprint — registry validation', () => {
  test('strict + missing registry key produces a contract-rejecting error', async () => {
    const { container } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'i18n-form': formCfg }}
        validationMode="strict"
        intl={{
          t: makeT('it'),
          // Deliberately omit `actions.save` from the registry so the
          // strict validator escalates to an error.
          registry: ['common.firstName', 'common.email', 'greeting.name'],
        }}
      />,
    );
    await waitFor(() => {
      // ValidationErrorPanel kicks in — look for its hallmark text.
      expect(container.textContent).toMatch(/contract is invalid/i);
      expect(container.textContent).toMatch(/actions\.save/);
    });
  });

  test('lenient + missing registry key still renders (warning, not error)', async () => {
    const { getByText } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        forms={{ 'i18n-form': formCfg }}
        validationMode="lenient"
        intl={{
          t: makeT('it'),
          registry: ['common.firstName', 'common.email', 'greeting.name'],
        }}
      />,
    );
    await waitFor(() => {
      // UI still renders — fallback resolution returns 'Salva' because
      // the `t` function still knows the key even though it's absent
      // from the static `registry`.
      expect(getByText('Salva')).toBeTruthy();
    });
  });
});
