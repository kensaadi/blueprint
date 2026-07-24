// Types
export type {
  BlueprintDocument,
  BlueprintNode,
  LibName,
  FormConfig,
  FormMountApi,
  Responsive,
  SpacingToken,
  RoundedToken,
  ElevationToken,
} from './types';

// Layout hint (responsive column span envelope) — types only; the
// flavor packs consume `LayoutHint` / `ResponsiveColumnSpan` to type their
// grid bindings. The schema/resolver stay internal to core.
export type { LayoutHint, ResponsiveColumnSpan, Breakpoint } from './layout';

// Visibility DSL
export { visibilityRuleSchema, visibilityValueSchema, collectFieldRefs } from './visibility';
export type { VisibilityRule, VisibilityValue } from './visibility';
export { evaluate as evaluateVisibility, collectFormFieldNames } from './evaluate';
export type { EvaluationContext } from './evaluate';

// Access rule
export { accessRuleSchema } from './access';
export type { AccessRule } from './access';

// Catalog
export { ATOM_NAMES, ATOM_PROP_SCHEMAS, ATOMS_REQUIRING_ID, isAtomName } from './atoms';
export type { AtomName } from './atoms';

// Schema + validator
export { documentSchema, nodeSchema, SUPPORTED_VERSIONS } from './schema';
export { validate } from './validator';
export type {
  Severity,
  ValidationError,
  ValidationMode,
  ValidationOptions,
  ValidationResult,
} from './errors';

// Registry contract
export type { AtomBinding, Registry } from './registry';

// Icon system
export {
  collectMissingIconRefs,
  iconIdSchema,
  ICON_REF_PROPS,
} from './icons';
export type { IconEntry, IconRegistry, IconRenderProps } from './icons';

// Inline rich text
export {
  inlineTextSchema,
  inlineNodeSchema,
  inlineTextRunSchema,
  inlineLinkSchema,
  inlineBreakSchema,
  translationRefSchema,
  translatableStringSchema,
  linkHrefSchema,
  isSafeHref,
  isTranslationRef,
} from './inline';
export type {
  InlineText,
  InlineNode,
  InlineTextRun,
  InlineLink,
  InlineBreak,
  TranslationRef,
  TranslatableString,
} from './inline';

// i18n
export {
  collectMissingTranslationKeys,
  collectTranslationRefs,
  resolveVars,
} from './intl';
export type { IntlConfig, TranslationRefSite } from './intl';

// Diagnostic helpers (rich error display)
export {
  parsePointer,
  valueAtPath,
  nodeAncestors,
  humanizePath,
  nearestNode,
  formatNodeSnippet,
  pointerLeaf,
} from './diagnostics';
export type { AncestorCrumb } from './diagnostics';
