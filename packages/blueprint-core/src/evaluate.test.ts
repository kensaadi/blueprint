import { describe, expect, it } from 'vitest';
import {
  evaluate as evaluateRule,
  collectFormFieldNames,
  type EvaluationContext,
} from './evaluate';
import type { VisibilityRule } from './visibility';

const makeCtx = (
  values: Record<string, unknown>,
  rules: Record<string, () => boolean> = {},
): EvaluationContext => ({
  resolvePath: (p) => {
    if (p.startsWith('$form.')) return values[p.slice('$form.'.length)];
    return undefined;
  },
  namedRules: rules,
});

describe('evaluate — leaf operators', () => {
  it('eq matches strings', () => {
    const rule: VisibilityRule = { field: '$form.country', eq: 'IT' };
    expect(evaluateRule(rule, makeCtx({ country: 'IT' }))).toBe(true);
    expect(evaluateRule(rule, makeCtx({ country: 'FR' }))).toBe(false);
  });

  it('eq is type-strict (no coercion)', () => {
    expect(evaluateRule({ field: '$form.x', eq: 1 }, makeCtx({ x: '1' }))).toBe(false);
    expect(evaluateRule({ field: '$form.x', eq: true }, makeCtx({ x: 1 }))).toBe(false);
  });

  it('neq is the inverse of eq', () => {
    const rule: VisibilityRule = { field: '$form.role', neq: 'admin' };
    expect(evaluateRule(rule, makeCtx({ role: 'user' }))).toBe(true);
    expect(evaluateRule(rule, makeCtx({ role: 'admin' }))).toBe(false);
  });

  it('in returns true when value matches any', () => {
    const rule: VisibilityRule = { field: '$form.country', in: ['IT', 'FR'] };
    expect(evaluateRule(rule, makeCtx({ country: 'IT' }))).toBe(true);
    expect(evaluateRule(rule, makeCtx({ country: 'FR' }))).toBe(true);
    expect(evaluateRule(rule, makeCtx({ country: 'DE' }))).toBe(false);
  });

  it('nin returns true when value matches none', () => {
    const rule: VisibilityRule = { field: '$form.country', nin: ['IT', 'FR'] };
    expect(evaluateRule(rule, makeCtx({ country: 'DE' }))).toBe(true);
    expect(evaluateRule(rule, makeCtx({ country: 'IT' }))).toBe(false);
  });

  it('exists treats undefined / null / empty string as "absent"', () => {
    const present: VisibilityRule = { field: '$form.x', exists: true };
    const absent: VisibilityRule = { field: '$form.x', exists: false };
    expect(evaluateRule(present, makeCtx({ x: 'hi' }))).toBe(true);
    expect(evaluateRule(present, makeCtx({ x: '' }))).toBe(false);
    expect(evaluateRule(present, makeCtx({ x: null }))).toBe(false);
    expect(evaluateRule(present, makeCtx({}))).toBe(false);
    expect(evaluateRule(absent, makeCtx({}))).toBe(true);
  });

  it('gt/gte/lt/lte compare numbers', () => {
    const ctx = makeCtx({ age: 25 });
    expect(evaluateRule({ field: '$form.age', gt: 18 }, ctx)).toBe(true);
    expect(evaluateRule({ field: '$form.age', gte: 25 }, ctx)).toBe(true);
    expect(evaluateRule({ field: '$form.age', lt: 25 }, ctx)).toBe(false);
    expect(evaluateRule({ field: '$form.age', lte: 25 }, ctx)).toBe(true);
  });

  it('gt comparisons fail across different types', () => {
    expect(evaluateRule({ field: '$form.x', gt: 10 }, makeCtx({ x: '20' }))).toBe(false);
  });
});

describe('evaluate — composers', () => {
  const country: VisibilityRule = { field: '$form.country', eq: 'IT' };
  const isPep: VisibilityRule = { field: '$form.isPep', eq: true };

  it('and is true only when every predicate is true', () => {
    const rule: VisibilityRule = { and: [country, isPep] };
    expect(evaluateRule(rule, makeCtx({ country: 'IT', isPep: true }))).toBe(true);
    expect(evaluateRule(rule, makeCtx({ country: 'IT', isPep: false }))).toBe(false);
    expect(evaluateRule(rule, makeCtx({ country: 'FR', isPep: true }))).toBe(false);
  });

  it('or is true when any predicate is true', () => {
    const rule: VisibilityRule = { or: [country, isPep] };
    expect(evaluateRule(rule, makeCtx({ country: 'IT', isPep: false }))).toBe(true);
    expect(evaluateRule(rule, makeCtx({ country: 'FR', isPep: true }))).toBe(true);
    expect(evaluateRule(rule, makeCtx({ country: 'FR', isPep: false }))).toBe(false);
  });

  it('not flips the inner verdict', () => {
    const rule: VisibilityRule = { not: country };
    expect(evaluateRule(rule, makeCtx({ country: 'FR' }))).toBe(true);
    expect(evaluateRule(rule, makeCtx({ country: 'IT' }))).toBe(false);
  });

  it('composers nest arbitrarily', () => {
    const rule: VisibilityRule = {
      or: [
        { and: [country, isPep] },
        { not: { field: '$form.country', exists: true } },
      ],
    };
    expect(evaluateRule(rule, makeCtx({ country: 'IT', isPep: true }))).toBe(true);
    expect(evaluateRule(rule, makeCtx({ country: '' }))).toBe(true);
    expect(evaluateRule(rule, makeCtx({ country: 'FR', isPep: false }))).toBe(false);
  });
});

describe('evaluate — named rule escape hatch', () => {
  it('looks up rules from the context', () => {
    const ctx = makeCtx({}, { isBeta: () => true, isAdmin: () => false });
    expect(evaluateRule({ rule: 'isBeta' }, ctx)).toBe(true);
    expect(evaluateRule({ rule: 'isAdmin' }, ctx)).toBe(false);
  });

  it('returns false when the named rule is not registered', () => {
    expect(evaluateRule({ rule: 'missing' }, makeCtx({}))).toBe(false);
  });
});

describe('evaluate — deeply-nested composers (3+ levels)', () => {
  it('and(or(and(...)), not(or(...))) — 4 levels deep, true case', () => {
    const ctx = makeCtx({ country: 'IT', tier: 'gold', kyc: true, blacklist: false });
    const rule: VisibilityRule = {
      and: [
        { or: [
          { and: [
            { field: '$form.country', eq: 'IT' },
            { field: '$form.tier', in: ['gold', 'platinum'] },
          ] },
          { field: '$form.vip', eq: true },
        ] },
        { not: { or: [
          { field: '$form.blacklist', eq: true },
          { field: '$form.kyc', eq: false },
        ] } },
      ],
    };
    expect(evaluateRule(rule, ctx)).toBe(true);
  });

  it('and(or(and(...)), not(or(...))) — same shape, false branch', () => {
    const ctx = makeCtx({ country: 'IT', tier: 'gold', kyc: true, blacklist: true });
    const rule: VisibilityRule = {
      and: [
        { or: [
          { and: [
            { field: '$form.country', eq: 'IT' },
            { field: '$form.tier', in: ['gold', 'platinum'] },
          ] },
          { field: '$form.vip', eq: true },
        ] },
        { not: { or: [
          { field: '$form.blacklist', eq: true },
          { field: '$form.kyc', eq: false },
        ] } },
      ],
    };
    // blacklist=true → inner or is true → not(true) = false → outer and = false
    expect(evaluateRule(rule, ctx)).toBe(false);
  });

  it('nested NOT chain (not(not(not(...)))) — odd parity flips', () => {
    const ctx = makeCtx({ active: true });
    const rule: VisibilityRule = {
      not: { not: { not: { field: '$form.active', eq: true } } },
    };
    // active=true → leaf=true → not = false → not(false) = true → not(true) = false
    expect(evaluateRule(rule, ctx)).toBe(false);
  });

  it('nested NOT chain — even parity preserves', () => {
    const ctx = makeCtx({ active: true });
    const rule: VisibilityRule = {
      not: { not: { field: '$form.active', eq: true } },
    };
    expect(evaluateRule(rule, ctx)).toBe(true);
  });

  it('alternating and/or 5 levels deep', () => {
    const ctx = makeCtx({ a: 1, b: 2, c: 3, d: 4, e: 5 });
    const rule: VisibilityRule = {
      and: [
        { or: [
          { and: [
            { or: [
              { and: [
                { field: '$form.a', gt: 0 },
                { field: '$form.b', gt: 0 },
              ] },
              { field: '$form.x', exists: true },
            ] },
            { field: '$form.c', gt: 0 },
          ] },
          { field: '$form.y', exists: true },
        ] },
        { field: '$form.d', gt: 0 },
        { field: '$form.e', gt: 0 },
      ],
    };
    expect(evaluateRule(rule, ctx)).toBe(true);
  });

  it('rule reference inside deep composer resolves correctly', () => {
    const ctx = makeCtx({ amount: 5000 }, { isHighRisk: () => true });
    const rule: VisibilityRule = {
      and: [
        { field: '$form.amount', gt: 1000 },
        { or: [
          { rule: 'isHighRisk' },
          { field: '$form.flagged', eq: true },
        ] },
      ],
    };
    expect(evaluateRule(rule, ctx)).toBe(true);
  });

  it('handles empty composer arrays defensively', () => {
    // Validator should reject these, but the evaluator must not crash if
    // an empty array somehow gets through (manually-crafted contracts,
    // future schema relaxation).
    const ctx = makeCtx({});
    // and([]) → vacuously true (every of [] is true)
    expect(evaluateRule({ and: [] }, ctx)).toBe(true);
    // or([]) → vacuously false (some of [] is false)
    expect(evaluateRule({ or: [] }, ctx)).toBe(false);
  });
});

describe('evaluate — non-$form paths', () => {
  it('resolves to undefined for unknown prefixes (and predicate fails)', () => {
    expect(evaluateRule({ field: '$user.role', eq: 'admin' }, makeCtx({}))).toBe(false);
  });
});

describe('collectFormFieldNames', () => {
  it('extracts field names from a leaf rule', () => {
    expect(collectFormFieldNames({ field: '$form.country', eq: 'IT' })).toEqual(['country']);
  });

  it('walks composers', () => {
    const rule: VisibilityRule = {
      and: [
        { field: '$form.country', eq: 'IT' },
        { or: [
          { field: '$form.taxId', exists: true },
          { not: { field: '$form.exempt', eq: true } },
        ] },
      ],
    };
    expect(collectFormFieldNames(rule).sort()).toEqual(['country', 'exempt', 'taxId']);
  });

  it('dedupes repeated references', () => {
    const rule: VisibilityRule = {
      and: [
        { field: '$form.country', eq: 'IT' },
        { field: '$form.country', neq: 'XX' },
      ],
    };
    expect(collectFormFieldNames(rule)).toEqual(['country']);
  });

  it('ignores non-$form paths', () => {
    expect(collectFormFieldNames({ field: '$user.role', eq: 'admin' })).toEqual([]);
  });

  it('ignores named-rule escape hatches', () => {
    expect(collectFormFieldNames({ rule: 'isBeta' })).toEqual([]);
  });
});
