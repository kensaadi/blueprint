/**
 * IconContext tests — IconProvider, useIcon hook resolution, fallback render.
 */
import { describe, expect, test, afterEach } from 'vitest';
import { cleanup, render, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import {
  IconProvider,
  useIcon,
  useIconRegistry,
  IconFallback,
} from './IconContext';
import type { IconRegistry } from '@dashforge/blueprint-core';

const REG: IconRegistry = [
  { id: 'save',  render: ({ size = 16 }) => createElement('span', { 'data-id': 'save', 'data-size': size }) },
  { id: 'trash', render: ({ size = 16 }) => createElement('span', { 'data-id': 'trash', 'data-size': size }) },
];

afterEach(() => cleanup());

function wrapper(registry: IconRegistry) {
  return function Wrap({ children }: { children: ReactNode }) {
    return <IconProvider registry={registry}>{children}</IconProvider>;
  };
}

describe('useIcon', () => {
  test('resolves registered id', () => {
    const { result } = renderHook(() => useIcon('save'), { wrapper: wrapper(REG) });
    expect(result.current?.id).toBe('save');
  });

  test('returns null for unknown id', () => {
    const { result } = renderHook(() => useIcon('missing'), { wrapper: wrapper(REG) });
    expect(result.current).toBeNull();
  });

  test('returns null for empty / undefined id', () => {
    const { result: empty } = renderHook(() => useIcon(''), { wrapper: wrapper(REG) });
    expect(empty.current).toBeNull();

    const { result: undef } = renderHook(() => useIcon(undefined), { wrapper: wrapper(REG) });
    expect(undef.current).toBeNull();

    const { result: nul } = renderHook(() => useIcon(null), { wrapper: wrapper(REG) });
    expect(nul.current).toBeNull();
  });

  test('defaults to empty registry without provider', () => {
    const { result: reg } = renderHook(() => useIconRegistry());
    expect(reg.current).toEqual([]);

    const { result } = renderHook(() => useIcon('save'));
    expect(result.current).toBeNull();
  });
});

describe('IconFallback', () => {
  test('renders a placeholder square with the id in aria-label', () => {
    const { container } = render(<IconFallback id="mystery" size={20} />);
    const el = container.querySelector('span');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('aria-label')).toBe('missing icon: mystery');
    expect(el?.getAttribute('title')).toBe('missing icon: mystery');
  });

  test('falls back to generic label when id is omitted', () => {
    const { container } = render(<IconFallback />);
    const el = container.querySelector('span');
    expect(el?.getAttribute('aria-label')).toBe('missing icon');
  });
});
