/**
 * Tests for the inline rich-text schema + URL sanitizer.
 */
import { describe, expect, test } from 'vitest';
import {
  inlineTextSchema,
  inlineNodeSchema,
  linkHrefSchema,
  isSafeHref,
} from './inline';

describe('isSafeHref', () => {
  test('accepts http / https / mailto / tel', () => {
    expect(isSafeHref('https://example.com')).toBe(true);
    expect(isSafeHref('http://example.com')).toBe(true);
    expect(isSafeHref('mailto:a@b.com')).toBe(true);
    expect(isSafeHref('tel:+1-555')).toBe(true);
  });
  test('accepts relative paths and fragments', () => {
    expect(isSafeHref('/docs')).toBe(true);
    expect(isSafeHref('#anchor')).toBe(true);
    expect(isSafeHref('?query=1')).toBe(true);
  });
  test('accepts custom schemes (consumer routing)', () => {
    expect(isSafeHref('app://settings')).toBe(true);
  });
  test('rejects javascript: in any case + leading whitespace', () => {
    expect(isSafeHref('javascript:alert(1)')).toBe(false);
    expect(isSafeHref('JAVASCRIPT:x')).toBe(false);
    expect(isSafeHref('  javascript:x')).toBe(false);
    expect(isSafeHref('JavaScript:x')).toBe(false);
  });
  test('rejects data: and vbscript:', () => {
    expect(isSafeHref('data:text/html,<script>')).toBe(false);
    expect(isSafeHref('vbscript:msgbox')).toBe(false);
  });
});

describe('linkHrefSchema', () => {
  test('rejects empty', () => {
    expect(linkHrefSchema.safeParse('').success).toBe(false);
  });
  test('rejects unsafe schemes', () => {
    expect(linkHrefSchema.safeParse('javascript:x').success).toBe(false);
    expect(linkHrefSchema.safeParse('data:foo').success).toBe(false);
  });
  test('accepts safe URLs', () => {
    expect(linkHrefSchema.safeParse('https://x.dev').success).toBe(true);
    expect(linkHrefSchema.safeParse('/relative').success).toBe(true);
  });
});

describe('inlineNodeSchema — discriminated union', () => {
  test('text run with flags', () => {
    expect(inlineNodeSchema.safeParse({
      type: 'text', text: 'hi', bold: true, italic: true, code: true,
    }).success).toBe(true);
  });
  test('link with valid href', () => {
    expect(inlineNodeSchema.safeParse({
      type: 'link', text: 'docs', href: 'https://x.dev',
    }).success).toBe(true);
  });
  test('link with unsafe href is rejected', () => {
    expect(inlineNodeSchema.safeParse({
      type: 'link', text: 'evil', href: 'javascript:alert(1)',
    }).success).toBe(false);
  });
  test('break has no props', () => {
    expect(inlineNodeSchema.safeParse({ type: 'break' }).success).toBe(true);
  });
  test('unknown type is rejected', () => {
    expect(inlineNodeSchema.safeParse({ type: 'image', src: 'x' }).success).toBe(false);
  });
  test('strict — extra keys are rejected on text', () => {
    expect(inlineNodeSchema.safeParse({
      type: 'text', text: 'hi', color: 'red',
    }).success).toBe(false);
  });
});

describe('inlineTextSchema — hybrid string | InlineNode[]', () => {
  test('plain string is accepted', () => {
    expect(inlineTextSchema.safeParse('Hello world').success).toBe(true);
    expect(inlineTextSchema.safeParse('').success).toBe(true);
  });
  test('non-empty inline array is accepted', () => {
    expect(inlineTextSchema.safeParse([
      { type: 'text', text: 'Click ' },
      { type: 'text', text: 'save', bold: true },
      { type: 'text', text: ' now' },
    ]).success).toBe(true);
  });
  test('empty array is rejected', () => {
    expect(inlineTextSchema.safeParse([]).success).toBe(false);
  });
  test('array with invalid node is rejected', () => {
    expect(inlineTextSchema.safeParse([
      { type: 'text', text: 'Click ' },
      { type: 'link', text: 'evil', href: 'javascript:x' },
    ]).success).toBe(false);
  });
  test('mixed nodes — text + link + break', () => {
    expect(inlineTextSchema.safeParse([
      { type: 'text', text: 'See ' },
      { type: 'link', text: 'docs', href: 'https://x.dev' },
      { type: 'break' },
      { type: 'text', text: 'or contact ' },
      { type: 'link', text: 'support', href: 'mailto:s@x.dev' },
    ]).success).toBe(true);
  });
});
