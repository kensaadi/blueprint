/**
 * TooltipEditor — editor for the `tooltip` (label-help) prop on form
 * atoms. The schema `fieldTooltipSchema` is a union:
 *
 *   string | { content, icon?, position?: 'before'|'after',
 *              side?: 'top'|'right'|'bottom'|'left' }
 *
 * A bare string is the shorthand; the object form customizes the ⓘ
 * trigger icon, its placement relative to the label (before/after) and
 * the popover side. The schema adapter collapses that union to
 * `kind: 'string'` (first primitive wins), so PropEditor intercepts
 * `tooltip` by key and mounts this instead — same pattern as the `icon`
 * IconPicker special-case.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { FieldTooltip } from '@dashforge/blueprint-core';
import { IconPicker } from './IconPicker';
import { TranslatableStringEditor } from './TranslatableStringEditor';

const inputBase =
  'w-full rounded-md border px-2.5 py-2 text-[13px] outline-none';
const inputStyle: CSSProperties = {
  background: 'var(--bd-item)',
  borderColor: 'var(--bd-border)',
  color: 'var(--bd-text)',
};

/** The object branch of the tooltip union. */
type TooltipObject = Exclude<FieldTooltip, string>;

function isObjectForm(v: unknown): v is TooltipObject {
  return typeof v === 'object' && v !== null;
}

export function TooltipEditor({
  value,
  onChange,
  placeholder,
}: {
  value: unknown;
  onChange: (next: unknown) => void;
  placeholder?: string;
}) {
  const advanced = isObjectForm(value);
  const obj: TooltipObject = advanced ? value : ({} as TooltipObject);
  const simpleText = typeof value === 'string' ? value : '';

  /**
   * Merge a patch into the object form, dropping empty/undefined keys so
   * the exported JSON stays tidy and `.strict()`-compliant. `content` is
   * the only required object key — an object without it is meaningless,
   * so we collapse to `undefined` (which flips the editor back to Simple).
   */
  const setObj = (patch: Partial<TooltipObject>) => {
    const next: Record<string, unknown> = { ...obj, ...patch };
    const clean: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(next)) {
      if (val === undefined || val === '') continue;
      clean[k] = val;
    }
    if (clean.content === undefined) return onChange(undefined);
    onChange(clean);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-1">
        <ModeChip
          active={!advanced}
          onClick={() => {
            if (!advanced) return;
            // Advanced → Simple: keep content only if it's a plain string
            // (an InlineNode[] can't round-trip through the text input).
            const c = obj.content;
            onChange(typeof c === 'string' ? c : undefined);
          }}
        >
          Simple
        </ModeChip>
        <ModeChip
          active={advanced}
          onClick={() => {
            if (advanced) return;
            // Simple → Advanced: promote the string into `content`.
            onChange(simpleText ? { content: simpleText } : undefined);
          }}
        >
          Advanced
        </ModeChip>
      </div>

      {!advanced ? (
        <input
          type="text"
          className={inputBase}
          style={inputStyle}
          placeholder={placeholder ?? 'Help text shown on hover'}
          value={simpleText}
          onChange={(e) =>
            onChange(e.target.value === '' ? undefined : e.target.value)
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <Row label="content">
            <TranslatableStringEditor
              value={obj.content}
              onChange={(v) =>
                setObj({ content: v as TooltipObject['content'] })
              }
              placeholder="Tooltip text"
            />
          </Row>
          <Row label="icon">
            <IconPicker
              value={typeof obj.icon === 'string' ? obj.icon : ''}
              onChange={(v) => setObj({ icon: v || undefined })}
              placeholder="info-circle"
            />
          </Row>
          <Row label="position">
            <MiniSelect
              value={obj.position}
              options={['before', 'after'] as const}
              onChange={(v) =>
                setObj({ position: v as TooltipObject['position'] })
              }
            />
          </Row>
          <Row label="side">
            <MiniSelect
              value={obj.side}
              options={['top', 'right', 'bottom', 'left'] as const}
              onChange={(v) => setObj({ side: v as TooltipObject['side'] })}
            />
          </Row>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="text-[11px] font-medium uppercase tracking-[0.08em]"
        style={{ color: 'var(--bd-text-soft)' }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function MiniSelect({
  value,
  options,
  onChange,
}: {
  value: string | undefined;
  options: readonly string[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <select
      className={inputBase}
      style={inputStyle}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
    >
      <option value="">— default —</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function ModeChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
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
