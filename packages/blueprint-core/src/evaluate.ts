/**
 * Visibility rule evaluator — pure, no React, no engine dep.
 *
 * Consumer wires `resolvePath` to read values from form state (or any
 * other source) and `namedRules` to handle escape-hatch rules.
 */

import type { VisibilityRule } from './visibility';

export type EvaluationContext = {
  resolvePath: (path: string) => unknown;
  namedRules?: Record<string, () => boolean>;
  /**
   * Callback fired when a user-supplied named rule throws. Optional —
   * absent callers get silent-false-on-throw. React layer wires this to
   * `bpWarn` so the surface is dev-visible.
   */
  onError?: (source: string, error: unknown) => void;
};

export function evaluate(rule: VisibilityRule, ctx: EvaluationContext): boolean {
  // Composers
  if ('and' in rule) return rule.and.every((p) => evaluate(p, ctx));
  if ('or' in rule)  return rule.or.some((p)  => evaluate(p, ctx));
  if ('not' in rule) return !evaluate(rule.not, ctx);

  // Escape hatch — user-supplied predicate. If the predicate throws we
  // treat it as false and let the runtime layer emit a dev warning. The
  // core stays pure (no logger dependency); the caller can wire warnings
  // via `onError`.
  if ('rule' in rule) {
    const fn = ctx.namedRules?.[rule.rule];
    if (!fn) return false;
    try {
      return Boolean(fn());
    } catch (e) {
      ctx.onError?.(`namedRule "${rule.rule}"`, e);
      return false;
    }
  }

  // Leaf — `field` always present here, narrow by operator
  const v = ctx.resolvePath(rule.field);

  if ('eq'  in rule) return strictEq(v, rule.eq);
  if ('neq' in rule) return !strictEq(v, rule.neq);
  if ('in'  in rule) return rule.in.some((x) => strictEq(v, x));
  if ('nin' in rule) return !rule.nin.some((x) => strictEq(v, x));
  if ('exists' in rule) {
    const present = v !== undefined && v !== null && v !== '';
    return present === rule.exists;
  }
  if ('gt'  in rule) return compare(v, rule.gt)  > 0;
  if ('gte' in rule) return compare(v, rule.gte) >= 0;
  if ('lt'  in rule) return compare(v, rule.lt)  < 0;
  if ('lte' in rule) return compare(v, rule.lte) <= 0;

  return false;
}

function strictEq(a: unknown, b: unknown): boolean {
  if (typeof a !== typeof b) return false;
  return Object.is(a, b);
}

function compare(a: unknown, b: number | string): number {
  if (typeof a !== typeof b) return Number.NaN;
  // both number or both string here
  if ((a as number) < (b as number)) return -1;
  if ((a as number) > (b as number)) return 1;
  return 0;
}

/**
 * Walk a rule and collect every `$form.X` field path it references.
 * Used by `VisibilityGate` to subscribe to the right form fields.
 */
export function collectFormFieldNames(rule: VisibilityRule): string[] {
  const out = new Set<string>();
  const walk = (r: VisibilityRule) => {
    if ('and' in r) { r.and.forEach(walk); return; }
    if ('or'  in r) { r.or.forEach(walk);  return; }
    if ('not' in r) { walk(r.not); return; }
    if ('rule' in r) return;
    if ('field' in r && r.field.startsWith('$form.')) {
      out.add(r.field.slice('$form.'.length));
    }
  };
  walk(rule);
  return [...out];
}
