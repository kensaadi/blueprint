/**
 * Atom catalog — the public contract that both flavor packs implement.
 *
 * Each entry pairs the atom name with a zod schema for its props. The
 * validator (`./validator.ts`) walks the contract and runs the matching
 * schema's `safeParse(props)` for every known atom; unknown types are
 * deferred to runtime (customNode / slot override / red block).
 */

import { z, type ZodTypeAny } from './zod-jitless';
import { inlineTextSchema, translatableStringSchema } from './inline';

// ─────────────────────────────────────────────────────────────────────
// Shared token schemas (mirror types.ts SpacingToken / RoundedToken / …)
// ─────────────────────────────────────────────────────────────────────

const spacingToken = z.enum(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']);
const roundedToken = z.enum(['none', 'sm', 'md', 'lg', 'xl', 'full']);
const elevationToken = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
const intentColor = z.enum(['neutral', 'primary', 'secondary', 'success', 'warning', 'danger', 'info']);

/** value OR { base, sm, md, lg, xl } */
function responsive<T extends ZodTypeAny>(inner: T) {
  return z.union([
    inner,
    z.object({
      base: inner.optional(),
      sm: inner.optional(),
      md: inner.optional(),
      lg: inner.optional(),
      xl: inner.optional(),
    }).strict(),
  ]);
}

// ─────────────────────────────────────────────────────────────────────
// Static-or-dynamic list props — an items/options list can be authored
// statically (an array) OR bound to a backend data source. The dynamic
// form references a `$prefix.path` the consumer resolves at runtime
// (convention: `$data.<key>`), with optional design-time `sample` items
// and static `prepend`/`append` items merged around the resolved list.
// ─────────────────────────────────────────────────────────────────────

/** `$prefix.path` reference — same syntax as visibility/access predicates. */
const dataSourceRef = z
  .string()
  .regex(/^\$[a-zA-Z]+\..+/, 'must be a "$prefix.path" reference, e.g. "$data.countries"');

/** The dynamic (backend-bound) branch of a list prop. */
function boundList(item: ZodTypeAny) {
  return z
    .object({
      source: dataSourceRef,
      /** Preview-only items rendered at design time; the backend swaps in the real list. */
      sample: z.array(item).optional(),
      /** Static items merged before the resolved list (e.g. an "All" option). */
      prepend: z.array(item).optional(),
      /** Static items merged after the resolved list. */
      append: z.array(item).optional(),
    })
    .strict();
}

/**
 * A list prop: a static array of `item` OR a {@link boundList} binding.
 * `min` (when given) applies only to the static array — the bound form
 * has no minimum since its items arrive at runtime.
 */
function listProp(item: ZodTypeAny, min?: { count: number; message: string }) {
  const staticArr = min
    ? z.array(item).min(min.count, min.message)
    : z.array(item);
  return z.union([staticArr, boundList(item)]);
}

/** A list-prop value: a static array of `T` OR a backend-bound reference. */
export type ListProp<T> =
  | T[]
  | { source: string; sample?: T[]; prepend?: T[]; append?: T[] };

/**
 * Runtime discriminator: is a list-prop value the dynamic (bound) form?
 * Exported so flavor bindings and the Builder share one check.
 */
export function isBoundList(
  v: unknown,
): v is { source: string; sample?: unknown[]; prepend?: unknown[]; append?: unknown[] } {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof (v as { source?: unknown }).source === 'string'
  );
}

// ─────────────────────────────────────────────────────────────────────
// Per-atom prop schemas — flat strict objects, every field optional
// unless explicitly required by the contract (e.g. heading.level)
// ─────────────────────────────────────────────────────────────────────

const stackProps = z.object({
  direction: z.enum(['row', 'column']).optional(),
  align: z.enum(['start', 'center', 'end', 'stretch']).optional(),
  justify: z.enum(['start', 'center', 'end', 'between', 'around']).optional(),
  spacing: spacingToken.optional(),
  p: spacingToken.optional(),
  m: spacingToken.optional(),
  /** Allow the stack to wrap onto multiple lines when it overflows. */
  wrap: z.boolean().optional(),
  /** Grow the stack to fill the available height. */
  fullHeight: z.boolean().optional(),
}).strict();

const gridProps = z.object({
  cols: responsive(z.number().int().positive()).optional(),
  gap: spacingToken.optional(),
  p: spacingToken.optional(),
}).strict();

const cardProps = z.object({
  p: spacingToken.optional(),
  rounded: roundedToken.optional(),
  elevation: elevationToken.optional(),
  /** Explicit 1px border ON/OFF; defaults to `false` (borderless). */
  border: z.boolean().optional(),
}).strict();

const sectionProps = z.object({
  spacing: spacingToken.optional(),
  p: spacingToken.optional(),
}).strict();

const textProps = z.object({
  tone: z.enum(['muted', 'success', 'warning', 'danger']).optional(),
  size: z.enum(['xs', 'sm', 'base', 'lg']).optional(),
  weight: z.enum(['normal', 'medium', 'bold']).optional(),
  align: z.enum(['left', 'center', 'right', 'justify']).optional(),
  /** Plain string OR InlineNode[] for bold/italic/code/link/break. */
  children: inlineTextSchema.optional(),
}).strict();

const headingProps = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  size: z.enum(['xl', '2xl', '3xl', '4xl', '5xl']).optional(),
  align: z.enum(['left', 'center', 'right', 'justify']).optional(),
  /** Plain string OR InlineNode[] — rare in headings but supported. */
  children: inlineTextSchema,
}).strict();

const buttonProps = z.object({
  label: translatableStringSchema,
  variant: z.enum(['solid', 'outline', 'ghost']).optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
  fullWidth: z.boolean().optional(),
  disabled: z.boolean().optional(),
  icon: z.string().min(1).optional(),
  iconPosition: z.enum(['start', 'end']).optional(),
}).strict();

const iconButtonProps = z.object({
  icon: z.string().min(1, 'iconButton.icon is required'),
  ariaLabel: translatableStringSchema,
  variant: z.enum(['solid', 'outline', 'ghost']).optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
  disabled: z.boolean().optional(),
}).strict();

const submitProps = z.object({
  label: translatableStringSchema.optional(),
  variant: z.enum(['solid', 'outline']).optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
  fullWidth: z.boolean().optional(),
}).strict();

const alertProps = z.object({
  severity: z.enum(['info', 'success', 'warning', 'danger']).optional(),
  title: inlineTextSchema.optional(),
  children: inlineTextSchema.optional(),
}).strict();

const dividerProps = z.object({}).strict();

// ─── Tier A: display / layout primitives ────────────────────────────

const boxProps = z.object({
  p: spacingToken.optional(),
  px: spacingToken.optional(),
  py: spacingToken.optional(),
  m: spacingToken.optional(),
  mx: spacingToken.optional(),
  my: spacingToken.optional(),
  rounded: roundedToken.optional(),
  elevation: elevationToken.optional(),
  fullWidth: z.boolean().optional(),
}).strict();

const containerProps = z.object({
  size: z.enum(['sm', 'md', 'lg', 'xl', 'full']).optional(),
  /** Toggle the responsive horizontal padding ramp (default on). */
  px: z.boolean().optional(),
  centerContent: z.boolean().optional(),
}).strict();

const badgeProps = z.object({
  /** Numeric or string content. Numbers honor `max`; omit + `dot:false` → no badge. */
  content: z.union([z.string(), z.number()]).optional(),
  /** Dot-only mode — ignores `content` + `max`. */
  dot: z.boolean().optional(),
  color: intentColor.optional(),
  placement: z.enum(['top-right', 'top-left', 'bottom-right', 'bottom-left']).optional(),
  /** `circular` for round anchors (Avatar), `rectangular` for square (IconButton/Card). */
  overlap: z.enum(['rectangular', 'circular']).optional(),
  max: z.number().int().positive().optional(),
  showZero: z.boolean().optional(),
}).strict();

const chipProps = z.object({
  label: translatableStringSchema,
  variant: z.enum(['soft', 'solid', 'outline']).optional(),
  color: intentColor.optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
  selected: z.boolean().optional(),
  disabled: z.boolean().optional(),
  /** Icon id from the registry (validator pass will check membership). */
  icon: z.string().min(1).optional(),
}).strict();

// ─── Tier B: navigation / interaction ───────────────────────────────

/**
 * Tabs — items[] declares triggers; panels are taken from `children`
 * by index (children[i] becomes the panel for items[i]).
 * State model: defaults-only (uncontrolled inside the binding); use a
 * slot override for fully-controlled behavior.
 */
const tabItem = z.object({
  value: z.string().min(1, 'tabs.item.value is required'),
  label: translatableStringSchema,
  disabled: z.boolean().optional(),
}).strict();

const tabsProps = z.object({
  items: z.array(tabItem).min(1, 'tabs.items must have at least one item'),
  defaultValue: z.string().optional(),
  variant: z.enum(['underline', 'pill']).optional(),
  orientation: z.enum(['horizontal', 'vertical']).optional(),
  /** Keep inactive panels mounted (hidden via [hidden]); useful for sticky form state. */
  keepMounted: z.boolean().optional(),
}).strict();

/**
 * Accordion — same children-as-panels pattern as tabs. Discriminated
 * union on `type`: `single` ⇒ defaultValue is string; `multiple` ⇒
 * defaultValue is string[].
 */
const accordionItem = z.object({
  value: z.string().min(1, 'accordion.item.value is required'),
  header: translatableStringSchema,
  disabled: z.boolean().optional(),
}).strict();

const accordionSingleProps = z.object({
  type: z.literal('single'),
  items: z.array(accordionItem).min(1, 'accordion.items must have at least one item'),
  defaultValue: z.string().optional(),
  collapsible: z.boolean().optional(),
}).strict();

const accordionMultipleProps = z.object({
  type: z.literal('multiple'),
  items: z.array(accordionItem).min(1, 'accordion.items must have at least one item'),
  defaultValue: z.array(z.string()).optional(),
}).strict();

const accordionProps = z.discriminatedUnion('type', [
  accordionSingleProps,
  accordionMultipleProps,
]);

/**
 * Tooltip — wraps a SINGLE child (the anchor). `content` is the
 * tooltip body. Validator enforces children.length === 1 elsewhere
 * (single-child constraint).
 */
const tooltipProps = z.object({
  content: inlineTextSchema,
  /**
   * Tabler icon name for the standalone trigger shown when the tooltip has
   * no child element — the "ⓘ info-hint" pattern. Ignored when the tooltip
   * wraps a child (that child becomes the trigger). Defaults to
   * `info-circle` in the binding.
   */
  icon: z.string().optional(),
  side: z.enum(['top', 'right', 'bottom', 'left']).optional(),
  align: z.enum(['start', 'center', 'end']).optional(),
  hideArrow: z.boolean().optional(),
  delayDuration: z.number().int().nonnegative().optional(),
  sideOffset: z.number().int().nonnegative().optional(),
}).strict();

/**
 * Breadcrumbs — pure presentational nav trail. Items declare the
 * crumbs inline. Navigation via `href` (browser default); SPA-router
 * integration via a `linkComponent` prop on DashBlueprint (future).
 */
const breadcrumbItem = z.object({
  id: z.string().min(1, 'breadcrumb.item.id is required'),
  label: translatableStringSchema,
  href: z.string().optional(),
  /** Marks the last crumb as the current page; gets aria-current="page". */
  current: z.boolean().optional(),
  disabled: z.boolean().optional(),
  /** Icon id from the registry. */
  icon: z.string().min(1).optional(),
}).strict();

const breadcrumbsProps = z.object({
  items: listProp(breadcrumbItem, { count: 1, message: 'breadcrumbs.items must have at least one item' }),
  /** `0` ⇒ never collapse. */
  maxItems: z.number().int().nonnegative().optional(),
  itemsBeforeCollapse: z.number().int().nonnegative().optional(),
  itemsAfterCollapse: z.number().int().nonnegative().optional(),
  ariaLabel: translatableStringSchema.optional(),
}).strict();

/**
 * Pagination — TW Pagination is controlled-only. We expose
 * defaults-only at the catalog layer; the binding owns `[page, setPage]`
 * internally via useState. For fully-controlled use, slot-override.
 */
/**
 * Calendar — standalone inline month grid. NOT a form field (use
 * `date` / `datePicker` for that). State model: defaults-only —
 * useState lives in the binding; consumer subscribes via slot override.
 *
 * Dates are ISO `YYYY-MM-DD` strings throughout (matches
 * @dashforge/calendar-core, shared between tw + mui flavors).
 *
 * The lib also exposes `isDateDisabled?: (date) => boolean` for
 * arbitrary predicates — we deliberately do NOT surface it: function
 * props can't live in a JSON contract. Use `disabledDates: string[]`
 * instead; for predicate-based logic, slot-override the calendar.
 */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected ISO YYYY-MM-DD');

const calendarProps = z.object({
  defaultValue: isoDate.nullable().optional(),
  defaultMonth: z.number().int().min(1).max(12).optional(),
  defaultYear: z.number().int().min(1900).max(9999).optional(),
  minDate: isoDate.optional(),
  maxDate: isoDate.optional(),
  disabledDates: z.array(isoDate).optional(),
  weekStartDay: z.union([
    z.literal(0), z.literal(1), z.literal(2), z.literal(3),
    z.literal(4), z.literal(5), z.literal(6),
  ]).optional(),
  /** BCP-47 locale; default 'en-US'. */
  locale: z.string().min(2).optional(),
  /** ISO `YYYY-MM-DD` override of "today" — useful for snapshot tests. */
  today: isoDate.optional(),
  disabled: z.boolean().optional(),
  autoFocus: z.boolean().optional(),
  ariaLabel: translatableStringSchema.optional(),
}).strict();

const paginationProps = z.object({
  /** Total items in the underlying data set (NOT total pages). */
  totalCount: z.number().int().nonnegative(),
  defaultPage: z.number().int().positive().optional(),
  defaultPageSize: z.number().int().positive().optional(),
  pageSizeOptions: z.array(z.number().int().positive()).min(1).optional(),
  siblingCount: z.number().int().nonnegative().optional(),
  boundaryCount: z.number().int().nonnegative().optional(),
  showFirstLast: z.boolean().optional(),
  showJumpInput: z.boolean().optional(),
  disabled: z.boolean().optional(),
  variant: z.enum(['default', 'compact']).optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
}).strict();

const avatarProps = z.object({
  /** Image URL (http(s) / data: / blob:) — falls back to initials/icon on load failure. */
  src: z.string().min(1).optional(),
  /** Full name used to derive initials when `src` is absent / fails. */
  name: z.string().optional(),
  size: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional(),
  shape: z.enum(['circle', 'rounded', 'square']).optional(),
  color: intentColor.optional(),
}).strict();

/** CSS object-fit — shared by the media atoms (image / video). */
const objectFit = z.enum(['cover', 'contain', 'fill', 'none', 'scale-down']);

const imageProps = z.object({
  /** Image source URL (http(s) / data:). Required. */
  src: z.string().min(1),
  /** Alternative text (a11y). Required; use `''` for purely decorative images. */
  alt: z.string(),
  /** Locks the box shape before load (no layout shift) — a ratio number (16/9) or a CSS aspect-ratio string. */
  aspectRatio: z.union([z.number(), z.string()]).optional(),
  fit: objectFit.optional(),
  rounded: roundedToken.optional(),
  loading: z.enum(['lazy', 'eager']).optional(),
  /** Show a skeleton while loading. Requires a reserved box (aspectRatio, or width+height). */
  showSkeleton: z.boolean().optional(),
}).strict();

const videoProps = z.object({
  /** Video source URL. Optional so `<source>` children can be authored instead. */
  src: z.string().min(1).optional(),
  /** Poster image shown before playback / while loading (doubles as the loading visual). */
  poster: z.string().optional(),
  aspectRatio: z.union([z.number(), z.string()]).optional(),
  fit: objectFit.optional(),
  rounded: roundedToken.optional(),
  /** Show the native player controls. */
  controls: z.boolean().optional(),
  /** Autoplay (requires `muted` in most browsers). */
  autoPlay: z.boolean().optional(),
  loop: z.boolean().optional(),
  muted: z.boolean().optional(),
  /** Keep playback inline on iOS instead of fullscreen. */
  playsInline: z.boolean().optional(),
  preload: z.enum(['none', 'metadata', 'auto']).optional(),
  /** Show a skeleton while the first frame loads (skipped when a poster is set). */
  showSkeleton: z.boolean().optional(),
}).strict();

/**
 * Label-help tooltip for a form field — a `ⓘ` in the label row revealing
 * `content` on hover / focus. Mirrors the `tooltip` prop on the underlying
 * `@dashforge/tw|ui` inputs; the flavor binding resolves `icon` (a Tabler
 * name) and wraps `content` before forwarding. String shorthand or config.
 */
const fieldTooltipSchema = z.union([
  z.string(),
  z.object({
    content: inlineTextSchema,
    /** Tabler icon name for the trigger. Defaults to info-circle in the component. */
    icon: z.string().optional(),
    /** Icon placement relative to the label. @default 'after' */
    position: z.enum(['before', 'after']).optional(),
    /** Which side the popup appears on. @default 'top' */
    side: z.enum(['top', 'right', 'bottom', 'left']).optional(),
  }).strict(),
]);

const fieldProps = z.object({
  name: z.string().min(1, 'field.name is required and must be non-empty'),
  label: translatableStringSchema.optional(),
  placeholder: translatableStringSchema.optional(),
  /** Plain string OR InlineNode[] — rich text supported for format hints with `code` etc. */
  helperText: inlineTextSchema.optional(),
  /** Label-help tooltip (ⓘ in the label row). String shorthand or config. */
  tooltip: fieldTooltipSchema.optional(),
  type: z.string().optional(),
  required: z.boolean().optional(),
}).strict();

const selectOption = z.object({
  value: z.string(),
  label: translatableStringSchema,
  disabled: z.boolean().optional(),
}).strict();

const selectProps = z.object({
  name: z.string().min(1, 'select.name is required'),
  label: translatableStringSchema.optional(),
  placeholder: translatableStringSchema.optional(),
  helperText: inlineTextSchema.optional(),
  required: z.boolean().optional(),
  options: listProp(selectOption, { count: 1, message: 'select.options must have at least one option' }),
}).strict();

const dateProps = z.object({
  name: z.string().min(1, 'date.name is required'),
  label: translatableStringSchema.optional(),
  placeholder: translatableStringSchema.optional(),
  helperText: inlineTextSchema.optional(),
  required: z.boolean().optional(),
  /** ISO date YYYY-MM-DD */
  min: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  max: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

const checkboxProps = z.object({
  name: z.string().min(1, 'checkbox.name is required'),
  label: translatableStringSchema.optional(),
  helperText: inlineTextSchema.optional(),
}).strict();

const switchProps = z.object({
  name: z.string().min(1, 'switch.name is required'),
  label: translatableStringSchema.optional(),
  helperText: inlineTextSchema.optional(),
}).strict();

// ─── P1: form essentials ────────────────────────────────────────────

const textareaProps = z.object({
  name: z.string().min(1, 'textarea.name is required'),
  label: translatableStringSchema.optional(),
  placeholder: translatableStringSchema.optional(),
  helperText: inlineTextSchema.optional(),
  required: z.boolean().optional(),
  rows: z.number().int().positive().optional(),
  maxLength: z.number().int().positive().optional(),
}).strict();

const numberProps = z.object({
  name: z.string().min(1, 'number.name is required'),
  label: translatableStringSchema.optional(),
  placeholder: translatableStringSchema.optional(),
  helperText: inlineTextSchema.optional(),
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  showStepper: z.boolean().optional(),
}).strict();

const radioOption = z.object({
  value: z.string(),
  label: translatableStringSchema,
  disabled: z.boolean().optional(),
}).strict();

const radioProps = z.object({
  name: z.string().min(1, 'radio.name is required'),
  label: translatableStringSchema.optional(),
  helperText: inlineTextSchema.optional(),
  required: z.boolean().optional(),
  orientation: z.enum(['horizontal', 'vertical']).optional(),
  options: listProp(radioOption, { count: 1, message: 'radio.options must have at least one option' }),
}).strict();

// ─── P2: date/time variants ─────────────────────────────────────────

const timeProps = z.object({
  name: z.string().min(1, 'time.name is required'),
  label: translatableStringSchema.optional(),
  placeholder: translatableStringSchema.optional(),
  helperText: inlineTextSchema.optional(),
  required: z.boolean().optional(),
  /** HH:mm 24-hour */
  min: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  max: z.string().regex(/^\d{2}:\d{2}$/).optional(),
}).strict();

const dateTimeProps = z.object({
  name: z.string().min(1, 'dateTime.name is required'),
  label: translatableStringSchema.optional(),
  placeholder: translatableStringSchema.optional(),
  helperText: inlineTextSchema.optional(),
  required: z.boolean().optional(),
}).strict();

const dateRangeProps = z.object({
  name: z.string().min(1, 'dateRange.name is required'),
  label: translatableStringSchema.optional(),
  placeholder: translatableStringSchema.optional(),
  helperText: inlineTextSchema.optional(),
  required: z.boolean().optional(),
  min: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  max: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

// ─── P3: form specialized ───────────────────────────────────────────

const autocompleteOption = z.object({
  value: z.string(),
  label: translatableStringSchema,
  disabled: z.boolean().optional(),
}).strict();

const autocompleteProps = z.object({
  name: z.string().min(1, 'autocomplete.name is required'),
  label: translatableStringSchema.optional(),
  placeholder: translatableStringSchema.optional(),
  helperText: inlineTextSchema.optional(),
  required: z.boolean().optional(),
  options: listProp(autocompleteOption),
}).strict();

const otpProps = z.object({
  name: z.string().min(1, 'otp.name is required'),
  label: translatableStringSchema.optional(),
  helperText: inlineTextSchema.optional(),
  required: z.boolean().optional(),
  length: z.number().int().min(2).max(12).optional(),
  mode: z.enum(['numeric', 'alphanumeric']).optional(),
}).strict();

/** `form` props are minimal — the lookup key is `node.id`, not a prop. */
const formProps = z.object({}).strict();

// ─────────────────────────────────────────────────────────────────────
// Catalog registry — single source of truth read by validator + Builder
// ─────────────────────────────────────────────────────────────────────

export const ATOM_PROP_SCHEMAS = {
  stack:        stackProps,
  grid:         gridProps,
  card:         cardProps,
  section:      sectionProps,
  text:         textProps,
  heading:      headingProps,
  button:       buttonProps,
  iconButton:   iconButtonProps,
  submit:       submitProps,
  alert:        alertProps,
  divider:      dividerProps,
  box:          boxProps,
  container:    containerProps,
  badge:        badgeProps,
  chip:         chipProps,
  avatar:       avatarProps,
  image:        imageProps,
  video:        videoProps,
  tabs:         tabsProps,
  accordion:    accordionProps,
  tooltip:      tooltipProps,
  breadcrumbs:  breadcrumbsProps,
  pagination:   paginationProps,
  calendar:     calendarProps,
  field:        fieldProps,
  select:       selectProps,
  date:         dateProps,
  checkbox:     checkboxProps,
  switch:       switchProps,
  textarea:     textareaProps,
  number:       numberProps,
  radio:        radioProps,
  time:         timeProps,
  dateTime:     dateTimeProps,
  dateRange:    dateRangeProps,
  autocomplete: autocompleteProps,
  otp:          otpProps,
  form:         formProps,
} as const;

export const ATOM_NAMES = Object.keys(ATOM_PROP_SCHEMAS) as Array<keyof typeof ATOM_PROP_SCHEMAS>;

export type AtomName = keyof typeof ATOM_PROP_SCHEMAS;

/** Resolved shape of a form field's `tooltip` prop (string shorthand or config). */
export type FieldTooltip = z.infer<typeof fieldTooltipSchema>;

export function isAtomName(value: string): value is AtomName {
  return value in ATOM_PROP_SCHEMAS;
}

/**
 * Atoms that REQUIRE `node.id` (not a prop, the top-level node id) for
 * the runtime to find a matching forms entry / slot override / etc.
 */
export const ATOMS_REQUIRING_ID = new Set<AtomName>(['form']);
