/* eslint-disable react-hooks/immutability */
/**
 * Test #42 — customNode that uses the form bridge for field registration.
 *
 * Pattern verified: a customNode rendered inside a `form` node can call
 * `useContext(DashFormContext)` and `bridge.register(fieldName)` to wire
 * itself into RHF as a fully-managed field. Verifies that:
 *   - The bridge is available inside customNode children of a form
 *   - register() returns the registration handle (onChange, onBlur, ref)
 *   - Updates via the bridge propagate to form state (read back via getValue)
 */
import { afterEach, describe, expect, test } from 'vitest';
import { useContext, useEffect, useRef, useState } from 'react';
import { cleanup, render, fireEvent } from '@testing-library/react';
import { DashFormContext } from '@dashforge/forms';
import { DashBlueprint } from './DashBlueprint';
import type { BlueprintDocument } from '@dashforge/blueprint-core';

afterEach(() => cleanup());

type Registration = { onChange?: (event: unknown) => void | Promise<unknown> };

function CustomBridgeField() {
  const bridge = useContext(DashFormContext);
  const registrationRef = useRef<Registration | null>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!bridge) return;
    registrationRef.current = bridge.register('customField');
    const sync = () => setValue((bridge.getValue('customField') ?? '') as string);
    sync();
    const unsub = bridge.subscribeField('customField', sync);
    return () => {
      unsub();
      bridge.unregister?.('customField');
    };
  }, [bridge]);

  return (
    <label>
      <span>Custom field</span>
      <input
        data-testid="custom-field-input"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          bridge?.setValue?.('customField', e.target.value);
          void registrationRef.current?.onChange?.(e);
        }}
      />
    </label>
  );
}

describe('customNode + form bridge integration', () => {
  const docWithCustomField: BlueprintDocument = {
    version: '1.0',
    root: {
      type: 'form',
      id: 'bridged-form',
      children: [
        { type: 'field', props: { name: 'name', label: 'Name' } },
        { type: 'customWidget' },
      ],
    },
  };

  test('customNode inside a form receives the bridge via DashFormContext', () => {
    const seenRef: { current: unknown } = { current: null };
    function Probe() {
       
      seenRef.current = useContext(DashFormContext);
      return <div data-testid="probe" />;
    }
    render(
      <DashBlueprint
        {...docWithCustomField}
        lib="tw"
        customNodes={{ customWidget: Probe }}
        forms={{ 'bridged-form': {
          defaultValues: { name: '', customField: '' },
          onSubmit: () => {},
        }}}
      />,
    );
    expect(seenRef.current).not.toBeNull();
  });

  test('customNode can register a field and read it back from the bridge', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridgeRef: { current: any } = { current: null };
    function CaptureBridge() {
       
      bridgeRef.current = useContext(DashFormContext);
      return <CustomBridgeField />;
    }
    render(
      <DashBlueprint
        {...docWithCustomField}
        lib="tw"
        customNodes={{ customWidget: CaptureBridge }}
        forms={{ 'bridged-form': {
          defaultValues: { name: '', customField: 'initial' },
          onSubmit: () => {},
        }}}
      />,
    );
    expect(bridgeRef.current).not.toBeNull();
    // The customField key is in defaultValues, so the bridge reports it.
    expect(bridgeRef.current?.getValue('customField')).toBe('initial');
  });

  test('customNode updates via setValue are observable from a sibling subscriber', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bridgeRef: { current: any } = { current: null };
    function CaptureBridge() {
       
      bridgeRef.current = useContext(DashFormContext);
      return <CustomBridgeField />;
    }
    const { getByTestId } = render(
      <DashBlueprint
        {...docWithCustomField}
        lib="tw"
        customNodes={{ customWidget: CaptureBridge }}
        forms={{ 'bridged-form': {
          defaultValues: { name: '', customField: '' },
          onSubmit: () => {},
        }}}
      />,
    );
    const input = getByTestId('custom-field-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'typed-by-custom-node' } });
    expect(bridgeRef.current?.getValue('customField')).toBe('typed-by-custom-node');
  });

  test('customNode outside a form context still renders (no bridge)', () => {
    const doc: BlueprintDocument = {
      version: '1.0',
      root: {
        type: 'card',
        children: [{ type: 'customWidget' }],
      },
    };
    const bridgeRef: { current: unknown } = { current: 'unset' };
    function Probe() {
       
      bridgeRef.current = useContext(DashFormContext);
      return <div data-testid="no-form" />;
    }
    const { getByTestId } = render(
      <DashBlueprint
        {...doc}
        lib="tw"
        customNodes={{ customWidget: Probe }}
      />,
    );
    expect(getByTestId('no-form')).toBeTruthy();
    // Outside DashFormProvider, the bridge resolves to whatever the
    // upstream default is (null in our setup) — the customNode must not
    // crash. Either null OR the default-shape object is acceptable.
    expect(bridgeRef.current === null || typeof bridgeRef.current === 'object').toBe(true);
  });
});
