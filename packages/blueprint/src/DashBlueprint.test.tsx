import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DashBlueprint } from './DashBlueprint';
import type { BlueprintDocument } from '@dashforge/blueprint-core';

const minimal: BlueprintDocument = {
  version: '1.0',
  root: { type: 'heading', props: { level: 1, children: 'Hello' } },
};

describe('DashBlueprint — lib selection', () => {
  it('renders under lib="tw"', () => {
    const { container } = render(<DashBlueprint {...minimal} lib="tw" />);
    expect(container.textContent).toContain('Hello');
  });

  it('renders under lib="mui"', () => {
    const { container } = render(<DashBlueprint {...minimal} lib="mui" />);
    expect(container.textContent).toContain('Hello');
  });

  it('falls back to contract.lib when prop lib is absent', () => {
    const docWithLib: BlueprintDocument = { ...minimal, lib: 'tw' };
    const { container } = render(<DashBlueprint {...docWithLib} />);
    expect(container.textContent).toContain('Hello');
  });

  it('renders an error panel when no lib is supplied', () => {
    const { container } = render(<DashBlueprint {...minimal} />);
    expect(container.textContent).toMatch(/requires a flavor/i);
  });
});

describe('DashBlueprint — validator integration', () => {
  it('rejects an unknown version with a red panel', () => {
    const bad = { version: '9.9', root: { type: 'card' } } as unknown as BlueprintDocument;
    const { container } = render(<DashBlueprint {...bad} lib="tw" />);
    expect(container.textContent).toMatch(/contract is invalid/i);
  });

  it('fires onValidationDiagnostics with errors', async () => {
    const onDiag = vi.fn();
    const bad = { version: '9.9', root: { type: 'card' } } as unknown as BlueprintDocument;
    render(<DashBlueprint {...bad} lib="tw" onValidationDiagnostics={onDiag} />);
    // useEffect fires after render
    await new Promise((r) => setTimeout(r, 50));
    expect(onDiag).toHaveBeenCalled();
    const arg = onDiag.mock.calls[0][0];
    expect(arg.errors.length).toBeGreaterThan(0);
  });

  it('lenient mode renders an unknown-type red block inline (does not reject)', () => {
    const doc: BlueprintDocument = {
      version: '1.0',
      root: { type: 'mysteryAtom' },
    };
    const { container } = render(
      <DashBlueprint {...doc} lib="tw" validationMode="lenient" />,
    );
    expect(container.textContent).toMatch(/Unknown node type/i);
  });

  it('strict mode rejects the whole render on unknown type', () => {
    const doc: BlueprintDocument = {
      version: '1.0',
      root: { type: 'mysteryAtom' },
    };
    const { container } = render(
      <DashBlueprint {...doc} lib="tw" validationMode="strict" />,
    );
    expect(container.textContent).toMatch(/contract is invalid/i);
  });
});

describe('DashBlueprint — extension dimensions', () => {
  it('customNodes priority over native registry', () => {
    const doc: BlueprintDocument = { version: '1.0', root: { type: 'myHero' } };
    const Hero = () => <div data-testid="hero">CUSTOM HERO</div>;
    const { getByTestId } = render(
      <DashBlueprint {...doc} lib="tw" customNodes={{ myHero: Hero }} />,
    );
    expect(getByTestId('hero')).toHaveTextContent('CUSTOM HERO');
  });

  it('slot override wins over native render (by id)', () => {
    const doc: BlueprintDocument = {
      version: '1.0',
      root: { type: 'card', id: 'foo', children: [{ type: 'heading', props: { level: 1, children: 'NATIVE' } }] },
    };
    const Override = <div data-testid="overridden">REPLACED</div>;
    const { getByTestId, container } = render(
      <DashBlueprint {...doc} lib="tw" foo={Override} />,
    );
    expect(getByTestId('overridden')).toBeTruthy();
    expect(container.textContent).not.toContain('NATIVE');
  });

  it('slots={} escape hatch resolves kebab-case ids', () => {
    const doc: BlueprintDocument = {
      version: '1.0',
      root: { type: 'card', id: 'kebab-case-id' },
    };
    const Override = <div data-testid="slot-override">SLOT</div>;
    const { getByTestId } = render(
      <DashBlueprint {...doc} lib="tw" slots={{ 'kebab-case-id': Override }} />,
    );
    expect(getByTestId('slot-override')).toHaveTextContent('SLOT');
  });

  it('slot override resolves on a node nested 3+ levels deep', () => {
    const doc: BlueprintDocument = {
      version: '1.0',
      root: {
        type: 'card',
        children: [{
          type: 'stack',
          children: [{
            type: 'section',
            children: [
              { type: 'text', props: { children: 'sibling-before' } },
              { type: 'card', id: 'deep-target' },
              { type: 'text', props: { children: 'sibling-after' } },
            ],
          }],
        }],
      },
    };
    const Override = <div data-testid="deep">REPLACED-DEEP</div>;
    const { getByTestId, container } = render(
      <DashBlueprint {...doc} lib="tw" slots={{ 'deep-target': Override }} />,
    );
    expect(getByTestId('deep')).toBeTruthy();
    expect(container.textContent).toContain('sibling-before');
    expect(container.textContent).toContain('sibling-after');
  });

  it('multiple nested slot overrides resolve independently in same render', () => {
    const doc: BlueprintDocument = {
      version: '1.0',
      root: {
        type: 'stack',
        children: [
          { type: 'card', id: 'first' },
          { type: 'section', children: [
            { type: 'card', id: 'second' },
            { type: 'section', children: [
              { type: 'card', id: 'third' },
            ]},
          ]},
        ],
      },
    };
    const { getByTestId } = render(
      <DashBlueprint
        {...doc}
        lib="tw"
        slots={{
          first: <div data-testid="s1">ONE</div>,
          second: <div data-testid="s2">TWO</div>,
          third: <div data-testid="s3">THREE</div>,
        }}
      />,
    );
    expect(getByTestId('s1')).toHaveTextContent('ONE');
    expect(getByTestId('s2')).toHaveTextContent('TWO');
    expect(getByTestId('s3')).toHaveTextContent('THREE');
  });

  it('slot override on a nested node ignores that node\'s children (replaces subtree)', () => {
    const doc: BlueprintDocument = {
      version: '1.0',
      root: {
        type: 'card',
        children: [{
          type: 'section', id: 'inner',
          children: [
            { type: 'text', props: { children: 'INNER-NATIVE-CONTENT' } },
          ],
        }],
      },
    };
    const Override = <div data-testid="inner-replaced">REPLACED-INNER</div>;
    const { container } = render(
      <DashBlueprint {...doc} lib="tw" slots={{ inner: Override }} />,
    );
    expect(container.textContent).toContain('REPLACED-INNER');
    expect(container.textContent).not.toContain('INNER-NATIVE-CONTENT');
  });

  it('slots[id] wins over the top-level prop with the same id (precedence)', () => {
    const doc: BlueprintDocument = {
      version: '1.0',
      root: { type: 'card', id: 'foo' },
    };
    const Top = <div data-testid="top">TOP</div>;
    const Slot = <div data-testid="slot">SLOT</div>;
    const { queryByTestId } = render(
      <DashBlueprint {...doc} lib="tw" foo={Top} slots={{ foo: Slot }} />,
    );
    expect(queryByTestId('slot')).toBeTruthy();
    expect(queryByTestId('top')).toBeNull();
  });

  it('unknown atom + no override + no customNode → red block in lenient mode', () => {
    const doc: BlueprintDocument = {
      version: '1.0',
      root: { type: 'doesNotExist' },
    };
    const { container } = render(<DashBlueprint {...doc} lib="tw" />);
    expect(container.textContent).toMatch(/Unknown node type/i);
  });
});

describe('DashBlueprint — atom prop pass-through', () => {
  it('renders nested children declared in the contract', () => {
    const doc: BlueprintDocument = {
      version: '1.0',
      root: {
        type: 'stack',
        children: [
          { type: 'heading', props: { level: 1, children: 'A' } },
          { type: 'heading', props: { level: 2, children: 'B' } },
        ],
      },
    };
    const { container } = render(<DashBlueprint {...doc} lib="tw" />);
    expect(container.textContent).toContain('A');
    expect(container.textContent).toContain('B');
  });

  it('leaf atoms get props.children as inline content', () => {
    const doc: BlueprintDocument = {
      version: '1.0',
      root: { type: 'text', props: { children: 'inline copy' } },
    };
    const { container } = render(<DashBlueprint {...doc} lib="tw" />);
    expect(container.textContent).toContain('inline copy');
  });
});
