/**
 * Runtime hardening — adversarial tests for the fault isolation layer.
 *
 * Each test forces a specific failure mode in user-supplied code and
 * asserts that:
 *   1. The tree keeps rendering (no crash bubbling up to the root).
 *   2. The failing node is replaced with a documented fallback UI or
 *      degrades to a safe default (visibility=false, translation=key).
 *   3. `console.warn` is called via bpWarn so the failure is dev-visible.
 *
 * These are guarantees consumers get in production; if any of them
 * regress the sandbox will stop being "one bad node, one broken node."
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DashBlueprint } from './DashBlueprint';
import type { BlueprintNode } from '@dashforge/blueprint-core';

function wrap(root: BlueprintNode): BlueprintNode {
  return {
    type: 'stack',
    nodeId: 'root',
    props: { spacing: 'md' },
    children: [
      { type: 'heading', nodeId: 'title', props: { level: 1, children: 'Alive' } },
      root,
      { type: 'text', nodeId: 'trailer', props: { children: 'Also alive' } },
    ],
  };
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  vi.restoreAllMocks();
  cleanup();
});

describe('DashBlueprint fault isolation — customNode', () => {
  it('replaces a throwing customNode with an inline alert without killing siblings', () => {
    function BombComponent(): JSX.Element {
      throw new Error('boom in customNode');
    }
    const contract = {
      version: '1.0' as const,
      root: wrap({ type: 'bomb', nodeId: 'bomb-node', props: {} }),
    };
    const { getByText, container } = render(
      <DashBlueprint {...contract} lib="tw" customNodes={{ bomb: BombComponent }} />,
    );

    // Siblings still there
    expect(getByText('Alive')).toBeTruthy();
    expect(getByText('Also alive')).toBeTruthy();
    // Fallback rendered in the failing node's spot
    expect(container.querySelector('[data-blueprint-fallback="customNode"]')).toBeTruthy();
  });
});

describe('DashBlueprint fault isolation — slot override', () => {
  it('replaces a throwing slot with an inline alert without killing siblings', () => {
    function BombSlot(): JSX.Element {
      throw new Error('boom in slot');
    }
    // Register the node as a customNode-typed placeholder so it's a valid
    // contract; the slot override wins over the component thanks to the
    // id-first priority in compileNode.
    const contract = {
      version: '1.0' as const,
      root: wrap({ type: 'placeholder', nodeId: 'bomb-slot', props: {} }),
    };
    const { getByText, container } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        customNodes={{ placeholder: () => <span>never renders</span> }}
        slots={{ 'bomb-slot': <BombSlot /> }}
      />,
    );

    expect(getByText('Alive')).toBeTruthy();
    expect(getByText('Also alive')).toBeTruthy();
    expect(container.querySelector('[data-blueprint-fallback="slot"]')).toBeTruthy();
  });
});

describe('DashBlueprint fault isolation — visibility named rule', () => {
  it('treats a throwing named-rule as false and keeps the rest of the tree alive', () => {
    const contract = {
      version: '1.0' as const,
      root: wrap({
        type: 'text',
        nodeId: 'gated',
        props: { children: 'should not appear' },
        visibility: { rule: 'brokenRule' },
      }),
    };
    const brokenRule = () => {
      throw new Error('boom in named rule');
    };
    const { getByText, queryByText } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        rules={{ brokenRule }}
      />,
    );

    expect(getByText('Alive')).toBeTruthy();
    expect(getByText('Also alive')).toBeTruthy();
    // Gated node NOT rendered — throw → false
    expect(queryByText('should not appear')).toBeNull();
    // Dev warn surfaced
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('DashBlueprint fault isolation — intl.t', () => {
  it('falls back to the translation key when intl.t throws', () => {
    const contract = {
      version: '1.0' as const,
      root: wrap({
        type: 'text',
        nodeId: 'translated',
        props: { children: { $t: 'welcome.title' } },
      }),
    };
    const throwingT = vi.fn(() => {
      throw new Error('boom in intl.t');
    });
    const { getByText } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        intl={{ t: throwingT }}
      />,
    );

    // Siblings still alive
    expect(getByText('Alive')).toBeTruthy();
    expect(getByText('Also alive')).toBeTruthy();
    // Fallback: the key rendered as-is
    expect(getByText('welcome.title')).toBeTruthy();
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('DashBlueprint fault isolation — icon.render', () => {
  it('replaces a throwing icon.render with IconFallback and keeps the button alive', () => {
    const contract = {
      version: '1.0' as const,
      root: wrap({
        type: 'button',
        nodeId: 'boom-btn',
        props: { label: 'Click me', icon: 'bomb' },
      }),
    };
    const throwingIcon = {
      id: 'bomb',
      render: () => {
        throw new Error('boom in icon render');
      },
    };
    const { getByText, container } = render(
      <DashBlueprint
        {...contract}
        lib="tw"
        icons={[throwingIcon]}
      />,
    );

    // Button label still visible — the icon slot degraded, not the button
    expect(getByText('Click me')).toBeTruthy();
    // IconFallback has a specific aria-label pattern
    expect(container.querySelector('[aria-label="missing icon: bomb"]')).toBeTruthy();
    expect(warnSpy).toHaveBeenCalled();
  });
});
