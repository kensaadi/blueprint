/**
 * InlineText tests — the string | InlineNode[] renderer. Covers literal
 * text, $t shorthand, mark composition (bold/italic/code), links (safe /
 * external / hostile-href fallback), line breaks, and the null path.
 */
import { describe, expect, test, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { InlineText } from './InlineText';
import { IntlProvider } from './IntlContext';
import type { IntlConfig } from '@dashforge/blueprint-core';

afterEach(() => cleanup());

const intl: IntlConfig = { t: (key) => `T:${key}` };

function renderInline(node: ReactNode) {
  return render(<IntlProvider intl={intl}>{node}</IntlProvider>);
}

describe('InlineText', () => {
  test('renders nothing for undefined / null', () => {
    const { container } = render(<InlineText value={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders a literal string', () => {
    const { container } = render(<InlineText value="Hello" />);
    expect(container.textContent).toBe('Hello');
  });

  test('resolves a top-level $t shorthand', () => {
    const { container } = renderInline(<InlineText value={{ $t: 'common.hi' }} />);
    expect(container.textContent).toBe('T:common.hi');
  });

  test('composes bold + italic + code marks into semantic tags', () => {
    const { container } = render(
      <InlineText
        value={[
          { text: 'b', bold: true },
          { text: 'i', italic: true },
          { text: 'c', code: true },
        ]}
      />,
    );
    expect(container.querySelector('strong')?.textContent).toBe('b');
    expect(container.querySelector('em')?.textContent).toBe('i');
    expect(container.querySelector('code')?.textContent).toBe('c');
  });

  test('renders a safe external link with target + rel', () => {
    const { container } = render(
      <InlineText value={[{ type: 'link', href: 'https://example.com', text: 'site' }]} />,
    );
    const a = container.querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://example.com');
    expect(a?.getAttribute('target')).toBe('_blank');
    expect(a?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  test('neutralises a hostile javascript: href to #', () => {
    const { container } = render(
      <InlineText value={[{ type: 'link', href: 'javascript:alert(1)', text: 'x' }]} />,
    );
    expect(container.querySelector('a')?.getAttribute('href')).toBe('#');
  });

  test('renders a line break node', () => {
    const { container } = render(<InlineText value={[{ type: 'break' }]} />);
    expect(container.querySelector('br')).not.toBeNull();
  });

  test('resolves a translated run inside an array', () => {
    const { container } = renderInline(
      <InlineText value={[{ $t: 'x.y', bold: true }]} />,
    );
    expect(container.querySelector('strong')?.textContent).toBe('T:x.y');
  });
});
