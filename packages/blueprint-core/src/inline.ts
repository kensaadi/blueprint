/**
 * Inline rich text — hybrid `string | InlineNode[]` model.
 *
 * Decision rationale (2026-06-22):
 *   - Plain string still accepted (90% of cases stay terse)
 *   - Array form for the 10% that need emphasis, code spans, links
 *   - Strictly inline semantic vocabulary (bold/italic/code/underline/
 *     strikethrough/link/break) — no block-level. Block structure
 *     remains the job of atoms (heading, text, stack, …).
 *   - URL sanitizer rejects `javascript:`, `data:`, `vbscript:` at the
 *     schema level — defense-in-depth (the renderer should also
 *     sanitize at runtime in case schemas are bypassed).
 *
 * No React in this file. Renderer lives in `blueprint/InlineText.tsx`.
 */
import { z } from './zod-jitless';

// ─── URL sanitizer ─────────────────────────────────────────────────

/**
 * Patterns explicitly rejected. Anything else (http(s), mailto, tel,
 * custom router-style `/path`, fragment `#anchor`, app-specific `app://`)
 * is allowed. Deny-list pattern.
 */
const UNSAFE_HREF_RE = /^\s*(javascript:|data:|vbscript:)/i;

export function isSafeHref(href: string): boolean {
  return !UNSAFE_HREF_RE.test(href);
}

export const linkHrefSchema = z
  .string()
  .min(1, 'link.href cannot be empty')
  .refine(isSafeHref, {
    message: 'link.href cannot use javascript:, data:, or vbscript: protocols',
  });

// ─── InlineNode union ──────────────────────────────────────────────

/**
 * A text run: either literal `text` or translated via `$t` (with
 * optional `vars`). Exactly one of the two must be present — enforced
 * by the refine below. Marks (bold/italic/code/underline/strike)
 * compose around either source.
 */
export const inlineTextRunSchema = z.object({
  type: z.literal('text'),
  text: z.string().optional(),
  $t: z.string().min(1, 'translation key cannot be empty').optional(),
  vars: z.record(z.string(), z.string()).optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  code: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
})
  .strict()
  .refine((v) => (v.text !== undefined) !== (v.$t !== undefined), {
    message: 'text run must have exactly one of `text` or `$t`',
  });

export const inlineLinkSchema = z.object({
  type: z.literal('link'),
  text: z.string().min(1),
  href: linkHrefSchema,
}).strict();

export const inlineBreakSchema = z.object({
  type: z.literal('break'),
}).strict();

/**
 * Shorthand for prop-level use: `{ children: { $t: 'common.save' } }`.
 * No `type` discriminator since at prop level there's no array
 * ambiguity. Same vars semantics as the inline run variant.
 */
export const translationRefSchema = z.object({
  $t: z.string().min(1, 'translation key cannot be empty'),
  vars: z.record(z.string(), z.string()).optional(),
}).strict();

export const inlineNodeSchema = z.discriminatedUnion('type', [
  inlineTextRunSchema,
  inlineLinkSchema,
  inlineBreakSchema,
]);

export type InlineTextRun = z.infer<typeof inlineTextRunSchema>;
export type TranslationRef = z.infer<typeof translationRefSchema>;
export type InlineLink = z.infer<typeof inlineLinkSchema>;
export type InlineBreak = z.infer<typeof inlineBreakSchema>;
export type InlineNode = z.infer<typeof inlineNodeSchema>;

/** Type guard for the `{ $t }` shorthand at prop level. */
export function isTranslationRef(v: unknown): v is TranslationRef {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    '$t' in v &&
    typeof (v as { $t: unknown }).$t === 'string'
  );
}

// ─── The hybrid prop schema ────────────────────────────────────────

/**
 * Use this for any prop that accepts user-visible copy and would
 * benefit from inline formatting:
 *
 *   - `text.children`
 *   - `heading.children`
 *   - `alert.title` + `alert.children`
 *   - `field.helperText`
 *   - `tooltip.content`
 *
 * Other text props (button.label, chip.label, breadcrumb.label) stay
 * as plain `z.string()` — they're short action surfaces and inline
 * formatting would be misuse.
 */
export const inlineTextSchema = z.union([
  z.string(),
  translationRefSchema,
  z.array(inlineNodeSchema).min(1, 'inline array must have at least one node'),
]);

export type InlineText = z.infer<typeof inlineTextSchema>;

// ─── Translatable plain string ─────────────────────────────────────

/**
 * Use this for short label/placeholder props that should accept either
 * a literal string OR a translation ref shorthand — but NOT inline
 * formatting (no array form). Targets atoms where rich text would be
 * misuse: `field.label`, `field.placeholder`, `button.label`,
 * `submit.label`, etc.
 *
 * The Tier B atoms (chip/tabs/breadcrumb) stay as plain `z.string()`
 * for now — they're often short, list-rendered, single-language in
 * practice. Follow-up PR migrates them if the demand surfaces.
 */
export const translatableStringSchema = z.union([
  z.string().min(1, 'translatable string cannot be empty'),
  translationRefSchema,
]);

export type TranslatableString = z.infer<typeof translatableStringSchema>;
