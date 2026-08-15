/**
 * PropEditor — dispatches on `PropField.kind` and renders the right
 * native input for a single atom prop.
 *
 * DOGFOOD note (G-26): `@dashforge/tw` form widgets are all bridge-
 * integrated — they require a `DashFormProvider` and register by
 * `name` for react-hook-form. There is no stand-alone controlled
 * `value` / `onChange` mode. The Inspector is not a form (it edits
 * one prop of one node), so we fall back to native HTML inputs
 * styled with the Builder's CSS variables. See report.
 */
import type { PropField } from './schemaAdapter';
import { FieldHint } from './FieldHint';
import { hintFor, placeholderFor } from './fieldHints';
import { IconPicker } from './IconPicker';
import { TooltipEditor } from './TooltipEditor';
import {
  TranslatableStringEditor,
  TRANSLATABLE_KEYS,
} from './TranslatableStringEditor';
import { InspectorSwitch } from '../primitives/InspectorSwitch';

type PropEditorProps = {
  field: PropField;
  value: unknown;
  onChange: (next: unknown) => void;
  /** Optional atom type so we can resolve `atom.propName` overrides. */
  atomType?: string;
};

/** Shared input styling — matches Theme A tokens. */
const inputBase =
  'w-full rounded-md border px-2.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-offset-0';
const inputStyle: React.CSSProperties = {
  background: 'var(--bd-item)',
  borderColor: 'var(--bd-border)',
  color: 'var(--bd-text)',
};

export function PropEditor({ field, value, onChange, atomType }: PropEditorProps) {
  const hint = hintFor(field.key, atomType);
  const placeholder = placeholderFor(field.key, atomType);
  const looksLikePlaceholder =
    field.key === 'label' &&
    typeof value === 'string' &&
    atomType !== undefined &&
    PLACEHOLDER_LABEL_BY_ATOM.get(atomType) === value;
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]"
        style={{ color: 'var(--bd-text-soft)' }}
      >
        {field.key}
        <FieldHint text={hint} />
        {!field.optional && (
          <span aria-hidden style={{ color: 'var(--bd-accent)' }}>
            · required
          </span>
        )}
      </span>
      {renderInput(field, value, onChange, placeholder)}
      {looksLikePlaceholder && (
        <span
          className="text-[11px] leading-snug"
          style={{ color: 'var(--bd-warning, #c47f00)' }}
        >
          ⚠ Still using the placeholder default. Rename before shipping — end
          users will see this as the field&apos;s label.
        </span>
      )}
      {field.description && (
        <span
          className="text-[11px] leading-snug"
          style={{ color: 'var(--bd-text-faint)' }}
        >
          {field.description}
        </span>
      )}
    </label>
  );
}

/**
 * Reverse index of the friendly-typename defaults emitted by the
 * factory (F-05 revert). If the current label value matches the
 * placeholder for its atom type, the Inspector warns the designer
 * before that placeholder ships to production (F-08).
 */
const PLACEHOLDER_LABEL_BY_ATOM = new Map<string, string>([
  ['field', 'Field'],
  ['textarea', 'Textarea'],
  ['number', 'Number'],
  ['select', 'Select'],
  ['autocomplete', 'Autocomplete'],
  ['checkbox', 'Checkbox'],
  ['switch', 'Switch'],
  ['radio', 'Radio'],
  ['date', 'Date'],
  ['time', 'Time'],
  ['dateTime', 'Date & time'],
  ['dateRange', 'Date range'],
  ['otp', 'OTP'],
]);

function renderInput(
  field: PropField,
  value: unknown,
  onChange: (next: unknown) => void,
  placeholder?: string,
) {
  // TranslatableString props (label, placeholder, helperText, …) are
  // zod UNIONS in the atom schemas, so the adapter reports them as
  // `kind: 'json'`. Intercept them by key name and render the proper
  // text-vs-$t editor instead of a JSON textarea.
  if (TRANSLATABLE_KEYS.has(field.key)) {
    return (
      <TranslatableStringEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    );
  }
  // `tooltip` (label-help) is a `string | { content, icon?, position?,
  // side? }` union the adapter collapses to `kind: 'string'`. Intercept
  // it by key and mount the dedicated compound editor.
  if (field.key === 'tooltip') {
    return (
      <TooltipEditor value={value} onChange={onChange} placeholder={placeholder} />
    );
  }
  switch (field.kind) {
    case 'string':
      // Special-case the `icon` prop: it's a string in the schema but
      // the UX we want is a visual picker with the Tabler icon set.
      if (field.key === 'icon') {
        return (
          <IconPicker
            value={typeof value === 'string' ? value : ''}
            onChange={(v) => onChange(v)}
            placeholder={placeholder}
          />
        );
      }
      return (
        <input
          type="text"
          className={inputBase}
          style={inputStyle}
          placeholder={placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          className={inputBase}
          style={inputStyle}
          placeholder={placeholder}
          value={typeof value === 'number' && !Number.isNaN(value) ? value : ''}
          onChange={(e) => {
            const raw = e.target.value;
            // Empty string → clear the prop (undefined) so the atom
            // schema can fall back to its default. Non-numeric input
            // is silently ignored to avoid persisting NaN.
            if (raw === '') return onChange(undefined);
            const n = Number(raw);
            if (Number.isFinite(n)) onChange(n);
          }}
        />
      );

    case 'boolean':
      // `required` is the most common boolean prop and benefits from
      // "on = required, off = optional" framing. All boolean props keep
      // the convention: undefined ⇔ false ⇔ switch off. Contract stores
      // `true` when on, and omits the key entirely when off — so the
      // exported JSON never carries redundant `false` values.
      return (
        <InspectorSwitch
          checked={value === true}
          onChange={(next) => onChange(next ? true : undefined)}
          ariaLabel={field.key}
        />
      );

    case 'enum': {
      const options = field.options ?? [];
      // Coerce back to the schema's expected primitive type. Native
      // `z.enum(...)` is always string, but number-literal unions
      // (`heading.level`, `elevationToken`) round-trip as numbers and
      // would fail strict validation with a "invalid input" error if
      // we wrote back a string here.
      const wantsNumber = field.enumValueType === 'number';
      const displayValue =
        value === undefined || value === null
          ? ''
          : String(value);
      return (
        <select
          className={inputBase}
          style={inputStyle}
          value={displayValue}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') return onChange(undefined);
            if (wantsNumber) {
              const n = Number(raw);
              onChange(Number.isFinite(n) ? n : undefined);
              return;
            }
            onChange(raw);
          }}
        >
          <option value="">— unset —</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    case 'responsive':
      return (
        <ResponsiveValueEditor
          value={value}
          kind={field.responsiveKind ?? 'number'}
          placeholder={placeholder}
          onChange={onChange}
        />
      );

    case 'json':
    default: {
      // Read-only surfacing for unsupported shapes. Editing complex
      // shapes lands with Phase 3d state-axes UI.
      const display =
        value === undefined ? '' : JSON.stringify(value, null, 2);
      return (
        <textarea
          readOnly
          className={inputBase + ' font-mono resize-y'}
          style={{ ...inputStyle, minHeight: 48 }}
          value={display}
        />
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Responsive value editor — scalar OR { base, sm, md, lg, xl }
// ─────────────────────────────────────────────────────────────────

const BP = ['base', 'sm', 'md', 'lg', 'xl'] as const;

type ResponsiveObject = Partial<Record<(typeof BP)[number], number | string>>;

function isResponsiveObject(v: unknown): v is ResponsiveObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Scalar / breakpoint editor for props whose schema is `responsive(inner)`.
 * Same Single/Responsive toggle pattern as the LayoutEditor above so
 * users transfer the muscle memory across both editors.
 */
function ResponsiveValueEditor({
  value,
  kind,
  placeholder,
  onChange,
}: {
  value: unknown;
  kind: 'number' | 'string';
  placeholder?: string;
  onChange: (next: unknown) => void;
}) {
  const isObject = isResponsiveObject(value);
  const scalar =
    kind === 'number'
      ? typeof value === 'number'
        ? value
        : undefined
      : typeof value === 'string'
        ? value
        : undefined;
  const obj: ResponsiveObject = isObject ? value : {};

  const parse = (raw: string): number | string | undefined => {
    if (raw === '') return undefined;
    if (kind === 'number') {
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    }
    return raw;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-1">
        <ModeChip
          active={!isObject}
          onClick={() => {
            if (isObject) {
              // Collapse to scalar — keep `base` if present, drop the rest.
              const collapsed = obj.base ?? obj.md ?? undefined;
              onChange(collapsed);
            }
          }}
        >
          Single
        </ModeChip>
        <ModeChip
          active={isObject}
          onClick={() => {
            if (!isObject) {
              // Promote current scalar (if any) into a `base` entry.
              onChange(scalar !== undefined ? { base: scalar } : { base: undefined });
            }
          }}
        >
          Responsive
        </ModeChip>
      </div>

      {!isObject ? (
        <input
          type={kind === 'number' ? 'number' : 'text'}
          className={inputBase}
          style={inputStyle}
          placeholder={placeholder}
          value={
            scalar === undefined
              ? ''
              : typeof scalar === 'number'
                ? scalar
                : scalar
          }
          onChange={(e) => onChange(parse(e.target.value))}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {BP.map((bp) => (
            <label key={bp} className="flex items-center gap-2">
              <span
                className="w-10 shrink-0 text-[11px] font-medium uppercase tracking-wide"
                style={{ color: 'var(--bd-text-soft)' }}
              >
                {bp}
              </span>
              <input
                type={kind === 'number' ? 'number' : 'text'}
                className={inputBase}
                style={inputStyle}
                value={
                  obj[bp] === undefined
                    ? ''
                    : typeof obj[bp] === 'number'
                      ? obj[bp]
                      : String(obj[bp])
                }
                onChange={(e) => {
                  const next = { ...obj };
                  const parsed = parse(e.target.value);
                  if (parsed === undefined) delete next[bp];
                  else next[bp] = parsed;
                  onChange(
                    Object.keys(next).length === 0 ? undefined : next,
                  );
                }}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border px-2 py-1 text-[12px] font-medium transition-colors"
      style={{
        borderColor: active ? 'var(--bd-accent)' : 'var(--bd-border)',
        background: active ? 'var(--bd-accent-bg)' : 'transparent',
        color: active ? 'var(--bd-accent)' : 'var(--bd-text-soft)',
      }}
    >
      {children}
    </button>
  );
}
