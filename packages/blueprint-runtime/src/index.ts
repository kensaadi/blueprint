/**
 * @dashforge/blueprint-runtime
 *
 * Shared React runtime primitives for Blueprint. This package sits between
 * the framework-agnostic `blueprint-core` (schemas / validator / types) and
 * the flavor packs (`blueprint-tw`, `blueprint-mui`) + the compiler
 * (`blueprint`).
 *
 * It exists to break a package cycle: both the flavor bindings AND the
 * compiler need the same React contexts, the inline-text renderer, the
 * translatable-value hook, and the warn channel. Hoisting them here keeps
 * the dependency graph acyclic:
 *
 *   blueprint-core → blueprint-runtime → { blueprint-tw, blueprint-mui } → blueprint
 *
 * Nothing here knows about Tailwind or MUI — these are the design-system
 * neutral runtime helpers only.
 */

// ─── Warn channel — silent in prod, single spy-able module ────────────
export { bpWarn } from './warn';

// ─── Icon system: providers, hooks, and the safe render helper ────────
export {
  IconProvider,
  useIcon,
  useIconRegistry,
  IconFallback,
  renderIcon,
} from './IconContext';

// ─── i18n: provider + hooks. `useTranslatable` is used by every atom ──
// binding that has a translatable label / placeholder / ariaLabel.
export { IntlProvider, useIntl } from './IntlContext';
export {
  useTranslatable,
  resolveTranslatableValue,
} from './useTranslatable';

// ─── Inline rich text renderer (bold / italic / link / break / $t) ────
export { InlineText } from './InlineText';
export { useFieldTooltip } from './useFieldTooltip';
export type { ResolvedFieldTooltip } from './useFieldTooltip';

// ─── Form-values context: publisher (mounted by the flavor form adapter)
// and the safe reader (used by InlineText + advanced custom nodes). ───
export { FormValuesPublisher, useFormValuesSafe } from './FormValuesContext';
