/**
 * i18n integration — design notes (2026-06-24).
 *
 * The contract opts into translation via a discriminator:
 *
 *   - `{ $t: 'common.save' }`              shorthand at prop level
 *   - `{ type: 'text', $t: 'common.save' }` inside an `InlineNode[]` array
 *
 * Both shapes carry an optional `vars` map; values may be literal
 * strings or `$form.X` refs resolved against current form state at
 * render time. Dynamic keys are NOT allowed — `$t` is a literal string
 * at schema time. See DESIGN.md for the rationale.
 *
 * The `t()` function lives entirely in the consumer — Blueprint doesn't
 * ship an i18n library. We just resolve the key + vars and call out.
 *
 * Resolution policy (matches `collectMissingIconRefs`):
 *   - registry provided + missing key → strict: error, lenient: warning
 *   - registry absent → no static validation, runtime fallback only
 *   - runtime: `t()` returns undefined / same string → render the key
 *
 * SSR note: the consumer is responsible for providing the SAME `intl.t`
 * (same locale) on server and client. Hydration mismatch is theirs to
 * prevent — Blueprint does not detect or reconcile.
 *
 * No React in this file. Provider/hook live in `blueprint/IntlContext.tsx`.
 */
import type { BlueprintNode } from './types';
import type { ValidationError } from './errors';
import { isAtomName } from './atoms';
import { isTranslationRef } from './inline';

/**
 * Consumer-supplied i18n config. Shape is intentionally minimal so any
 * lib (react-intl, i18next, FormatJS, hand-rolled) can adapt.
 *
 *   - `locale` — opaque label, passed through to `t()` if it needs to
 *     branch on language. Blueprint doesn't interpret it.
 *   - `t` — pure resolver. Returns the translated string. If the key is
 *     unknown, return `undefined` (preferred) or the key itself; either
 *     way the renderer falls back gracefully.
 *   - `registry` — optional. If present, the validator emits a
 *     diagnostic for any `$t` key not in the set (warning in lenient,
 *     error in strict).
 */
export type IntlConfig = {
  locale?: string;
  t: (key: string, vars?: Record<string, unknown>) => string | undefined;
  registry?: ReadonlyArray<string> | ReadonlySet<string>;
};

/**
 * Resolve `vars` map values: pass through literals, replace `$form.X`
 * refs with the current form value. Returns undefined if the input is
 * undefined to keep call sites terse.
 *
 * `formValues` may be null when no form context is in scope (e.g. a
 * `$t` ref inside a top-level `heading`). In that case `$form.*` refs
 * resolve to undefined — the consumer's `t()` decides what to do
 * (usually render the key literally).
 */
export function resolveVars(
  vars: Record<string, string> | undefined,
  formValues: Record<string, unknown> | null,
): Record<string, unknown> | undefined {
  if (!vars) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value === 'string' && value.startsWith('$form.')) {
      const path = value.slice('$form.'.length);
      out[key] = formValues?.[path];
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * A single `$t` reference found inside the contract.
 *
 *   - `key`  — the literal translation key (`$t`)
 *   - `path` — RFC-6901 JSON pointer to the reference site
 *   - `vars` — optional vars map (literals + `$form.X` refs as written)
 */
export type TranslationRefSite = {
  key: string;
  path: string;
  vars?: Record<string, string>;
};

/**
 * Walk every prop of every atom, collect every `$t` key referenced —
 * both the shorthand at prop level (`{ children: { $t } }`) and
 * `type: 'text'` runs inside `InlineNode[]` arrays. Also walks generic
 * array values (`options[]`, `items[]`) for atoms whose schema accepts
 * `translatableString` per-item (chip/tabs/breadcrumbs/select/radio/
 * autocomplete options).
 *
 * Returns one entry per reference site — duplicates allowed because the
 * SAME key may appear in multiple places, and the devtools want to show
 * each occurrence with its path.
 */
export function collectTranslationRefs(
  root: BlueprintNode,
): TranslationRefSite[] {
  const refs: TranslationRefSite[] = [];
  walk(root, '/root');
  return refs;

  function walk(node: BlueprintNode, prefix: string): void {
    if (isAtomName(node.type) && node.props) {
      for (const [propKey, value] of Object.entries(node.props)) {
        collectFromValue(value, `${prefix}/props/${propKey}`);
      }
    }
    node.children?.forEach((child, i) => walk(child, `${prefix}/children/${i}`));
  }

  function collectFromValue(value: unknown, path: string): void {
    if (value == null) return;
    if (isTranslationRef(value)) {
      refs.push({ key: value.$t, path, vars: value.vars });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          // Inline text node with `$t` (in helperText / children arrays)
          if (o.type === 'text' && typeof o.$t === 'string') {
            refs.push({
              key: o.$t,
              path: `${path}/${i}`,
              vars: (o.vars as Record<string, string> | undefined) ?? undefined,
            });
            return;
          }
          // Generic object item with a translatable `label` / `header` —
          // covers chip-list, tabs items, accordion items, breadcrumbs
          // items, select/radio/autocomplete options.
          for (const field of ['label', 'header']) {
            const fv = o[field];
            if (isTranslationRef(fv)) {
              refs.push({ key: fv.$t, path: `${path}/${i}/${field}`, vars: fv.vars });
            }
          }
        }
      });
    }
  }
}

/**
 * Emit a diagnostic for each `$t` reference whose key is missing from
 * the registry. Severity follows the validation mode, matching the
 * icon-ref pattern (`collectMissingIconRefs`).
 *
 * When `registry` is undefined, returns an empty array — static
 * validation is opt-in, runtime fallback always works.
 */
export function collectMissingTranslationKeys(
  root: BlueprintNode,
  registry: ReadonlyArray<string> | ReadonlySet<string> | undefined,
  mode: 'strict' | 'lenient',
): ValidationError[] {
  if (!registry) return [];
  const set = registry instanceof Set ? registry : new Set(registry);
  const refs = collectTranslationRefs(root);
  // Dedupe by key+path so the SAME ref doesn't surface twice.
  const seen = new Set<string>();
  const out: ValidationError[] = [];
  for (const { key, path } of refs) {
    if (set.has(key)) continue;
    const sig = `${key}@${path}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({
      path,
      message: `Translation key "${key}" is not registered. Add it to \`intl.registry\` or correct the key.`,
      severity: mode === 'strict' ? ('error' as const) : ('warning' as const),
      code: 'UNKNOWN_TRANSLATION_KEY',
      received: key,
    });
  }
  return out;
}
