/**
 * Field-hint dictionary — customer-facing explanations for every
 * Inspector label.
 *
 * Copy guidelines:
 *   - Plain English, no library internals (no "$form.*", no
 *     "Decision #17", no "bridge", no "RBAC" without explaining it).
 *   - Include a concrete example when it makes the concept land faster
 *     ("e.g. you@example.com", "e.g. show 'Company' only when …").
 *   - Complement the input's placeholder, don't repeat it verbatim —
 *     the tooltip goes deeper than the placeholder does.
 *
 * Lookup order in `hintFor()`:
 *   1. `atomType + '.' + key` — atom-specific
 *   2. bare `key` — cross-atom prop
 *   3. envelope key (e.g. `node.id`, `visibility`)
 * Returns `undefined` when no hint is registered.
 */

const AXIS_HINTS: Record<string, string> = {
  // ─── Envelope ────────────────────────────────────────────────
  'node.id':
    "A unique name for this element. Use short, descriptive tags like 'checkout' or 'shipping-address'. Required for forms — it's the name your code uses to attach validation and read submitted values.",
  type:
    "The kind of element this is (a text input, a button, a section…). Determines which settings appear below.",
  props:
    "The settings specific to this element type. Fields like label, placeholder, and required apply here.",
  children:
    "Elements nested inside this container. Drag more atoms into the dashed area on the canvas to add them here.",

  // ─── State axes ──────────────────────────────────────────────
  visibility:
    "When should this element appear? 'Always visible' shows it every time, 'Hidden' removes it entirely, 'Rule' shows it only when a condition is met — e.g. show a 'Company name' field only when the account type is 'business'.",
  disabled:
    "If checked, users cannot interact with this element — it's greyed out and read-only. Leave unchecked for normal behaviour.",
  access:
    "Show or hide this element based on the current user's permissions. For example, only users with the 'admin' role can see a 'Delete' button. Choose a resource, an action, and what happens when access is denied.",
  slots:
    "Replace a named inner area of this element with custom content. For example, a card has a 'header' slot you can override with a special banner. Most elements don't need this — leave empty unless you know you need it.",
  'access.resource':
    "Which data or feature this element refers to. Examples: 'invoices', 'customers', 'admin-panel'. Your app maps these names to permissions.",
  'access.action':
    "What the user is trying to do. Common choices: 'read' (view), 'update' (edit), 'delete' (remove), 'create' (add new).",
  'access.onUnauthorized':
    "What users without permission see: 'hide' removes it, 'disable' shows it greyed out, 'readonly' shows it but blocks edits.",

  // ─── Common form-field props ─────────────────────────────────
  name:
    "The internal name of this field. Becomes the key in the form data — e.g. name='email' means the submitted data contains { email: '…' }. Use camelCase without spaces.",
  label:
    "The text shown above the input, visible to the user. Example: 'Email address'. For translated apps, use the $t syntax like { $t: 'kyc.email.label' }.",
  placeholder:
    "A short hint shown inside the empty input to suggest what to type. Example: 'you@example.com'.",
  helperText:
    "A small line of guidance shown below the input. Example: 'We'll never share your email.'",
  required:
    "If checked, users must fill this field before they can submit the form. An asterisk appears next to the label.",
  variant:
    "The visual style. 'Solid' is a filled, prominent look; 'outline' has just a border; 'ghost' is minimal (no background, no border).",
  size:
    "How big the element renders. 'sm' is compact, 'md' is standard, 'lg' is prominent.",
  icon:
    "An icon shown alongside the label. Enter a Tabler icon name — for example 'user', 'check', or 'trash'.",
  iconPosition:
    "Where the icon sits relative to the label — before it (start) or after it (end).",
  min:
    "The smallest allowed value. For number fields it's a number (e.g. 0). For date fields it's an ISO date (e.g. 2020-01-01). For time fields it's HH:mm.",
  max:
    "The largest allowed value. Same format as min.",
  step:
    "How much the value changes each time the arrow keys or stepper buttons are pressed. Example: step=5 lets users pick 0, 5, 10, 15…",
  showStepper:
    "If checked, show the +/− buttons next to the number input so users can click to increment instead of typing.",
  rows:
    "How many rows tall the textarea appears initially. Users can still type more; the box scrolls.",
  maxLength:
    "The maximum number of characters the user can type. Example: 50 for a short name field.",
  orientation:
    "Arrange the radio options in a row (horizontal) or in a column (vertical).",
  options:
    "The list of choices the user can pick from. Each option needs a value (used in the form data) and a label (what the user sees).",
  length:
    "Number of digits in the one-time code. Common values: 4, 6, or 8.",

  // ─── Layout props ────────────────────────────────────────────
  direction:
    "Stack children horizontally (row) or vertically (column).",
  align:
    "How children line up along the cross axis — for a column stack, this is horizontal alignment.",
  justify:
    "How children are spread out along the main axis. 'between' pushes them to the edges with equal gaps.",
  gap:
    "The space between children. 'sm' is tight, 'md' is standard, 'lg' gives it room to breathe.",
  cols:
    "How many columns the grid uses. On mobile you may want fewer — use the responsive object form to set different values per screen size.",
  p: "Padding on all four sides. Use 'md' as a baseline.",
  px: "Left and right padding. Overrides the horizontal side of 'p'.",
  py: "Top and bottom padding.",
  m: "Margin (outer spacing) on all four sides.",
  mx: "Left and right margin.",
  my: "Top and bottom margin.",
  rounded:
    "How rounded the corners are. 'sm' is subtle, 'lg' is pronounced, 'full' makes it a pill.",
  elevation:
    "The shadow depth. Higher numbers lift the element more off the page.",
  fullWidth:
    "If checked, the element expands to fill the whole available width.",

  // ─── Content props ───────────────────────────────────────────
  text:
    "The text content. Plain string, or an array of inline runs for mixed formatting (bold, code, links).",
  tone:
    "The colour vibe. 'muted' fades it back; 'success' is green; 'warning' is yellow; 'danger' is red.",
  weight:
    "How bold the text renders — 'normal', 'medium' (semi-bold), or 'bold'.",
  level:
    "Heading level from 1 to 6. Level 1 is the biggest / most important; level 6 is the smallest.",
  severity:
    "The alert intent — 'info' for neutral notices, 'success' for confirmations, 'warning' for cautions, 'danger' for errors.",
  title:
    "The heading text for this section or alert.",

  // ─── Navigation / display ────────────────────────────────────
  items:
    "The list of items to show. Each entry has its own shape — for tabs it's { id, label }, for breadcrumbs it's { label, href }, etc.",
  content:
    "The body content shown inside this element (accordion panel, tooltip text, etc.).",
  header:
    "The header text shown at the top of this accordion section.",
  current:
    "Which page is currently active (1-based). Example: current=2 highlights page 2.",
  total:
    "Total number of items across all pages. The paginator uses this to compute how many pages there are.",
  pageSize:
    "How many items appear on each page.",
  ariaLabel:
    "A short description read by screen readers. Required on icon-only buttons that have no visible text — e.g. 'Delete row'.",
  alt:
    "Description of the avatar image, used by screen readers and shown if the image fails to load.",

  // ─── Form ────────────────────────────────────────────────────
  'form.id':
    "A unique name for this form (e.g. 'checkout', 'kyc-onboarding'). Your app uses this name to attach validation rules and handle submission.",
};

/**
 * Return the tooltip text for a given Inspector field, or `undefined`
 * if none is registered. Callers should render the info icon
 * conditionally so an unregistered field looks clean.
 */
export function hintFor(key: string, atomType?: string): string | undefined {
  if (atomType) {
    const specific = AXIS_HINTS[`${atomType}.${key}`];
    if (specific) return specific;
  }
  return AXIS_HINTS[key];
}

// ─────────────────────────────────────────────────────────────────
// Placeholders — quick hint shown INSIDE the empty input, so the
// user's first read already conveys what to type. Complements the
// tooltip which goes deeper on hover.
// ─────────────────────────────────────────────────────────────────

const PLACEHOLDERS: Record<string, string> = {
  'node.id': 'e.g. checkout-form',
  name: 'e.g. email',
  label: 'e.g. Email address',
  placeholder: 'e.g. you@example.com',
  helperText: "e.g. We'll never share your email.",
  icon: 'e.g. user',
  ariaLabel: 'e.g. Delete row',
  alt: 'e.g. Profile picture',
  'access.resource': 'e.g. invoices',
  'access.action': 'e.g. read',
  text: 'e.g. Welcome back!',
  title: 'e.g. Personal details',
  content: 'e.g. Tooltip explanation',
  header: 'e.g. Contact information',
  'form.id': 'e.g. checkout',
};

export function placeholderFor(key: string, atomType?: string): string | undefined {
  if (atomType) {
    const specific = PLACEHOLDERS[`${atomType}.${key}`];
    if (specific) return specific;
  }
  return PLACEHOLDERS[key];
}

// ─────────────────────────────────────────────────────────────────
// Example JSON snippets — shown as `placeholder` on JSON textareas so
// the user immediately sees the expected shape. Real content types
// over them and hides the example.
// ─────────────────────────────────────────────────────────────────

export const JSON_EXAMPLES = {
  visibilityRule: `Example — show only when country is Italy:

{
  "field": "$form.country",
  "eq": "IT"
}

Combine with and / or / not for complex conditions.`,

  slots: `Example — replace the card header with a custom banner:

{
  "header": {
    "type": "alert",
    "props": {
      "severity": "info",
      "title": "Premium plan"
    }
  }
}

Available slot names depend on the atom type. Leave empty if you don't need to customise inner areas.`,
} as const;
