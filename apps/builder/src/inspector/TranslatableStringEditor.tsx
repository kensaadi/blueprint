/* eslint-disable react-refresh/only-export-components -- component colocates with the TRANSLATABLE_KEYS constant it drives */
/**
 * TranslatableStringEditor — editor for props that accept either a
 * plain string OR a translation reference `{ $t: 'namespace.key' }`.
 *
 * These are Blueprint's `TranslatableString` shapes: `label`,
 * `placeholder`, `helperText`, `title`, `text`, `header`, `content`,
 * `ariaLabel`, `alt`. The user picks a mode with the toggle at the
 * top; the underlying stored value swaps between `string` and
 * `{ $t }` accordingly.
 *
 * Deliberately does NOT support the InlineNode-array shape yet — that's
 * a Phase 3d editor (inline runs of text with `code`/`link` spans).
 * A stored InlineNode array falls through the JSON textarea fallback.
 */
import type { CSSProperties } from 'react';

const inputBase =
  'w-full rounded-md border px-2.5 py-2 text-[13px] outline-none';
const inputStyle: CSSProperties = {
  background: 'var(--bd-item)',
  borderColor: 'var(--bd-border)',
  color: 'var(--bd-text)',
};

/** Prop keys the Blueprint schemas mark as TranslatableString. */
export const TRANSLATABLE_KEYS = new Set([
  'label',
  'placeholder',
  'helperText',
  'title',
  'text',
  'header',
  'content',
  'ariaLabel',
  'alt',
]);

type TValue = unknown;

/** Detect `{ $t: '…' }` shape. */
function isTranslationRef(v: TValue): v is { $t: string } {
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as { $t?: unknown }).$t === 'string'
  );
}

function currentMode(v: TValue): 'text' | 'translation' | 'complex' {
  if (isTranslationRef(v)) return 'translation';
  if (v === undefined || v === null || typeof v === 'string') return 'text';
  return 'complex';
}

export function TranslatableStringEditor({
  value,
  onChange,
  placeholder,
}: {
  value: TValue;
  onChange: (next: TValue) => void;
  placeholder?: string;
}) {
  const mode = currentMode(value);

  if (mode === 'complex') {
    // Something exotic (InlineNode[] or a shape we don't recognise) —
    // show a read-only JSON preview so it's obvious the value exists
    // but isn't editable here. The Advanced JSON editor lands 3d.
    return (
      <div className="flex flex-col gap-1.5">
        <ModeToggle mode="complex" onSwitch={(m) => switchMode(m, value, onChange)} />
        <pre
          className={inputBase + ' font-mono'}
          style={{ ...inputStyle, minHeight: 48 }}
        >
          {JSON.stringify(value, null, 2)}
        </pre>
        <span
          className="text-[11px] leading-snug"
          style={{ color: 'var(--bd-text-faint)' }}
        >
          Inline-node arrays and other rich values are read-only for now.
          Switch mode to overwrite with plain text or a translation key.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <ModeToggle mode={mode} onSwitch={(m) => switchMode(m, value, onChange)} />
      {mode === 'text' ? (
        <input
          type="text"
          className={inputBase}
          style={inputStyle}
          placeholder={placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="flex flex-col gap-1">
          <input
            type="text"
            className={inputBase}
            style={inputStyle}
            placeholder="e.g. common.save"
            value={isTranslationRef(value) ? value.$t : ''}
            onChange={(e) => onChange({ $t: e.target.value })}
          />
          <span
            className="text-[11px] leading-snug"
            style={{ color: 'var(--bd-text-faint)' }}
          >
            The intl bridge resolves this key at render time. Missing keys
            fall back to the literal string, so the UI never breaks.
          </span>
        </div>
      )}
    </div>
  );
}

/** Swap the stored value shape when the user toggles mode. */
function switchMode(
  next: 'text' | 'translation',
  current: TValue,
  onChange: (v: TValue) => void,
) {
  if (next === 'text') {
    const carry = isTranslationRef(current) ? '' : typeof current === 'string' ? current : '';
    onChange(carry);
    return;
  }
  const seed = typeof current === 'string' && current ? '' : '';
  onChange({ $t: isTranslationRef(current) ? current.$t : seed });
}

function ModeToggle({
  mode,
  onSwitch,
}: {
  mode: 'text' | 'translation' | 'complex';
  onSwitch: (m: 'text' | 'translation') => void;
}) {
  return (
    <div
      className="flex w-max items-center rounded-md border"
      style={{ borderColor: 'var(--bd-border)' }}
    >
      <ModeChip
        active={mode === 'text'}
        onClick={() => onSwitch('text')}
        label="Plain text"
      />
      <ModeChip
        active={mode === 'translation'}
        onClick={() => onSwitch('translation')}
        label="Translation key"
        badge="$t"
      />
    </div>
  );
}

function ModeChip({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium transition-colors"
      style={{
        background: active ? 'var(--bd-accent-bg)' : 'transparent',
        color: active ? 'var(--bd-accent)' : 'var(--bd-text-soft)',
      }}
    >
      {label}
      {badge && (
        <span
          className="rounded px-1 py-0.5 font-mono text-[9px]"
          style={{
            background: active ? 'var(--bd-accent)' : 'var(--bd-item)',
            color: active ? 'var(--bd-accent-fg)' : 'var(--bd-text-faint)',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
