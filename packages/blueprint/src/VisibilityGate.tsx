/**
 * Renders children only when the supplied `VisibilityRule` evaluates to
 * true. Subscribes to the specific form fields the rule references via
 * `bridge.subscribeField(name)` so the gate re-renders only when those
 * fields change — never on every keystroke of unrelated inputs.
 *
 * Outside a `<DashFormProvider>` the gate still works: form-state paths
 * resolve to `undefined`, named rules are evaluated against `rules`.
 *
 * Note: STATIC `boolean` visibility is handled upstream in compileNode
 * (fast path — no gate needed). This component is only invoked with
 * predicate rules.
 */

import { type ReactNode, useContext, useMemo, useSyncExternalStore } from 'react';
import { DashFormContext } from '@dashforge/forms';
import {
  type VisibilityRule,
  collectFormFieldNames,
  evaluateVisibility,
} from '@dashforge/blueprint-core';
import { bpWarn } from '@dashforge/blueprint-runtime';

export type NamedRuleMap = Record<string, () => boolean>;

export function VisibilityGate({
  rule,
  rules,
  children,
}: {
  rule: VisibilityRule;
  rules?: NamedRuleMap;
  children: ReactNode;
}) {
  const bridge = useContext(DashFormContext);
  const fieldNames = useMemo(() => collectFormFieldNames(rule), [rule]);

  const subscribe = useMemo(
    () => (listener: () => void) => {
      if (!bridge) return () => undefined;
      const unsubs = fieldNames.map((n) => bridge.subscribeField(n, listener));
      return () => {
        unsubs.forEach((u) => u());
      };
    },
    [bridge, fieldNames],
  );

  const getSnapshot = useMemo(
    () => () => {
      if (!bridge) return '';
      return fieldNames
        .map((n) => JSON.stringify(bridge.getValue(n) ?? null))
        .join(' ');
    },
    [bridge, fieldNames],
  );

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const resolvePath = (path: string): unknown => {
    if (!bridge || !path.startsWith('$form.')) return undefined;
    return bridge.getValue(path.slice('$form.'.length));
  };

  const visible = evaluateVisibility(rule, {
    resolvePath,
    namedRules: rules,
    onError: (source, error) =>
      bpWarn(source, 'threw during visibility evaluation — treating as false.', error),
  });
  return visible ? <>{children}</> : null;
}
