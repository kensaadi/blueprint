/**
 * <InlineText /> — renders the hybrid `string | InlineNode[]` shape.
 *
 * The atom bindings (Text, Heading, Alert, Field.helperText, Tooltip)
 * consume any "user-visible copy" prop through this component to get
 * uniform inline-formatting support.
 *
 * Defense in depth on links:
 *   1. Schema (`linkHrefSchema`) rejects `javascript:` etc. at validate
 *      time — see `blueprint-core/inline.ts`.
 *   2. The renderer below ALSO calls `isSafeHref()` and falls back to
 *      `#` if a hostile href somehow reaches this point.
 *
 * Output is plain semantic HTML — no inline styles, no className
 * overrides. Consumers can style via descendant CSS targeting
 * `[data-blueprint-inline] strong`, `code`, etc.
 */
import { Fragment, type ReactNode } from 'react';
import {
  isSafeHref,
  isTranslationRef,
  resolveVars,
  type InlineNode,
  type InlineText as InlineTextValue,
  type IntlConfig,
} from '@dashforge/blueprint-core';
import { useIntl } from './IntlContext';
import { useFormValuesSafe } from './FormValuesContext';
import { bpWarn } from './warn';

export function InlineText({ value }: { value?: InlineTextValue }) {
  const intl = useIntl();
  const formValues = useFormValuesSafe();

  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;

  // Prop-level shorthand: `{ children: { $t: 'common.save' } }`.
  if (isTranslationRef(value)) {
    return resolveTranslation(value.$t, value.vars, intl, formValues);
  }

  return (
    <span data-blueprint-inline>
      {value.map((node, i) => (
        <Fragment key={i}>{renderInline(node, intl, formValues)}</Fragment>
      ))}
    </span>
  );
}

function resolveTranslation(
  key: string,
  vars: Record<string, string> | undefined,
  intl: IntlConfig | null,
  formValues: Record<string, unknown> | null,
): string {
  if (!intl) return key;
  // Consumer-supplied `intl.t` is user code — isolate throws so a bad
  // translator can't crash the whole tree via inline rendering. Matches
  // the guard in useTranslatable.ts.
  try {
    const resolved = intl.t(key, resolveVars(vars, formValues));
    return resolved === undefined ? key : resolved;
  } catch (e) {
    bpWarn(`intl.t("${key}")`, 'threw during translation — falling back to the key.', e);
    return key;
  }
}

function renderInline(
  node: InlineNode,
  intl: IntlConfig | null,
  formValues: Record<string, unknown> | null,
): ReactNode {
  if (node.type === 'break') return <br />;

  if (node.type === 'link') {
    const href = isSafeHref(node.href) ? node.href : '#';
    const isExternal = /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      >
        {node.text}
      </a>
    );
  }

  // text run — either literal (`text`) or translated (`$t`). `$t` is an
  // optional field on the run node, so guard on its presence: this both
  // narrows the type to `string` and encodes the "translation xor literal"
  // intent (a run without a key falls back to its literal text).
  const literal =
    '$t' in node && node.$t
      ? resolveTranslation(node.$t, node.vars, intl, formValues)
      : node.text;

  // Apply marks from innermost (code) to outermost (bold) — semantic order.
  let el: ReactNode = literal;
  if (node.code)          el = <code>{el}</code>;
  if ('strikethrough' in node && node.strikethrough) el = <s>{el}</s>;
  if ('underline' in node && node.underline)     el = <u>{el}</u>;
  if (node.italic)        el = <em>{el}</em>;
  if (node.bold)          el = <strong>{el}</strong>;
  return el;
}
