/**
 * @dashforge/blueprint — public entry.
 *
 * This is the ONLY surface that consumers depend on. Adding, removing,
 * or renaming a symbol here is a breaking change. `api-surface.test.ts`
 * enforces the shape of this file — if you intentionally change it,
 * update the golden snapshot in that test.
 *
 * What consumers legitimately need:
 *   - The runtime component  → DashBlueprint
 *   - Types to write contracts → BlueprintDocument, BlueprintNode, …
 *   - Types to write extensions → IconEntry, IntlConfig, TranslatableString, …
 *   - Providers/hooks so custom nodes can plug into icons/intl/form state
 *   - Utilities to introspect contracts → validate, ATOM_NAMES, isAtomName
 *
 * What we deliberately do NOT expose (implementation details):
 *   - compileTree / CompileContext   → owned by DashBlueprint, no external need
 *   - LIBS registry map              → flavor set is closed (tw / mui)
 *   - VisibilityGate                 → same DSL is available via node.visibility
 *   - bpWarn / NodeErrorBoundary     → internal fault-isolation glue
 */

// ─── Runtime entry ────────────────────────────────────────────────────
export { DashBlueprint } from './DashBlueprint';
export type { DashBlueprintProps } from './DashBlueprint';

// ─── Type for the `rules={{ ... }}` prop on DashBlueprint ─────────────
export type { NamedRuleMap } from './VisibilityGate';

// ─── Icon system: providers, hooks, and the safe render helper ────────
export {
  IconProvider,
  useIcon,
  useIconRegistry,
  IconFallback,
  renderIcon,
} from '@dashforge/blueprint-runtime';

// ─── i18n: provider + hooks. `useTranslatable` is used by every atom ──
// binding that has a translatable label / placeholder / ariaLabel.
export { IntlProvider, useIntl } from '@dashforge/blueprint-runtime';
export {
  useTranslatable,
  resolveTranslatableValue,
} from '@dashforge/blueprint-runtime';

// ─── Inline rich text renderer (bold / italic / link / break / $t) ────
export { InlineText } from '@dashforge/blueprint-runtime';

// ─── Form-values context — needed by advanced custom nodes that want
// to react to sibling field values (rare but legitimate).
export { useFormValuesSafe } from '@dashforge/blueprint-runtime';

// ─── Contract types + core utilities (re-exports from blueprint-core)  ─
// Single import for consumers so they don't chase `-core` for types.
export type {
  BlueprintDocument,
  BlueprintNode,
  LibName,
  VisibilityRule,
  VisibilityValue,
  AccessRule,
  FormConfig,
  FormMountApi,
  Responsive,
  SpacingToken,
  RoundedToken,
  ElevationToken,
  AtomName,
  AtomBinding,
  Registry,
  ValidationError,
  ValidationMode,
  ValidationOptions,
  ValidationResult,
  Severity,
  IconEntry,
  IconRegistry,
  IconRenderProps,
  IntlConfig,
  TranslatableString,
  TranslationRef,
  InlineNode,
  InlineText as InlineTextValue,
  InlineTextRun,
  InlineLink,
  InlineBreak,
} from '@dashforge/blueprint-core';
export {
  ATOM_NAMES,
  ATOMS_REQUIRING_ID,
  isAtomName,
  validate,
  isTranslationRef,
  isSafeHref,
} from '@dashforge/blueprint-core';
