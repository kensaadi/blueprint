/**
 * ItemsEditor — editor for array props: select/radio/autocomplete
 * `options`, breadcrumbs/tabs/accordion `items`.
 *
 * Static arrays get an add / remove / reorder row editor, each row a
 * recursive `<PropEditor>` over the element's fields. `bindable` lists
 * (select/radio/autocomplete/breadcrumbs — the listProp union) also offer
 * a Backend mode: a `$data.<key>` source + optional `sample` (design-time
 * preview) and static `prepend`/`append` items merged around the resolved
 * list. Tabs/accordion are static-only (structural children-panel linkage).
 */
import type { CSSProperties, ReactNode } from 'react';
import { isBoundList } from '@dashforge/blueprint-core';
import type { PropField } from './schemaAdapter';
import { PropEditor } from './PropEditor';

const inputBase =
  'w-full rounded-md border px-2.5 py-2 text-[13px] outline-none';
const inputStyle: CSSProperties = {
  background: 'var(--bd-item)',
  borderColor: 'var(--bd-border)',
  color: 'var(--bd-text)',
};

type ItemObj = Record<string, unknown>;
type BoundValue = {
  source: string;
  sample?: ItemObj[];
  prepend?: ItemObj[];
  append?: ItemObj[];
};

/** Seed a new row: required string/enum fields get a starter value. */
function blankItem(itemFields: PropField[]): ItemObj {
  const o: ItemObj = {};
  for (const f of itemFields) {
    if (f.optional) continue;
    o[f.key] = f.kind === 'enum' && f.options?.length ? f.options[0] : '';
  }
  return o;
}

export function ItemsEditor({
  field,
  value,
  onChange,
}: {
  field: PropField;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const itemFields = field.itemFields ?? [];
  const bound = isBoundList(value);
  const asArray = Array.isArray(value) ? (value as ItemObj[]) : [];

  if (!field.bindable) {
    return <ArrayRows items={asArray} itemFields={itemFields} onChange={onChange} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-1">
        <ModeChip
          active={!bound}
          onClick={() => {
            if (!bound) return;
            const bv = value as BoundValue;
            onChange(bv.sample ?? bv.prepend ?? []);
          }}
        >
          Static
        </ModeChip>
        <ModeChip
          active={bound}
          onClick={() => {
            if (bound) return;
            onChange({
              source: '$data.items',
              sample: asArray.length ? asArray : undefined,
            });
          }}
        >
          Backend
        </ModeChip>
      </div>

      {!bound ? (
        <ArrayRows items={asArray} itemFields={itemFields} onChange={onChange} />
      ) : (
        <BackendEditor
          value={value as BoundValue}
          itemFields={itemFields}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function BackendEditor({
  value,
  itemFields,
  onChange,
}: {
  value: BoundValue;
  itemFields: PropField[];
  onChange: (next: unknown) => void;
}) {
  const set = (patch: Partial<BoundValue>) => {
    const merged: BoundValue = { ...value, ...patch };
    // Drop empty arrays so the exported JSON stays tidy + strict-valid.
    const clean: BoundValue = { source: merged.source ?? '' };
    if (merged.sample?.length) clean.sample = merged.sample;
    if (merged.prepend?.length) clean.prepend = merged.prepend;
    if (merged.append?.length) clean.append = merged.append;
    onChange(clean);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.08em]"
          style={{ color: 'var(--bd-text-soft)' }}
        >
          source
        </span>
        <input
          type="text"
          className={inputBase}
          style={inputStyle}
          placeholder="$data.countries"
          value={value.source ?? ''}
          onChange={(e) => set({ source: e.target.value })}
        />
        <span className="text-[11px] leading-snug" style={{ color: 'var(--bd-text-faint)' }}>
          Backend data key (<code>$data.&lt;key&gt;</code>). The consumer&apos;s{' '}
          <code>resolveData</code> maps it to the real list at runtime.
        </span>
      </label>

      <Section label="Sample — design-time preview">
        <ArrayRows
          items={value.sample ?? []}
          itemFields={itemFields}
          onChange={(next) => set({ sample: next as ItemObj[] })}
        />
      </Section>
      <Section label="Prepend — static, before the list">
        <ArrayRows
          items={value.prepend ?? []}
          itemFields={itemFields}
          onChange={(next) => set({ prepend: next as ItemObj[] })}
        />
      </Section>
      <Section label="Append — static, after the list">
        <ArrayRows
          items={value.append ?? []}
          itemFields={itemFields}
          onChange={(next) => set({ append: next as ItemObj[] })}
        />
      </Section>
    </div>
  );
}

function ArrayRows({
  items,
  itemFields,
  onChange,
}: {
  items: ItemObj[];
  itemFields: PropField[];
  onChange: (next: ItemObj[]) => void;
}) {
  const update = (i: number, key: string, v: unknown) => {
    const next = items.map((it, idx) => {
      if (idx !== i) return it;
      const merged = { ...it, [key]: v };
      if (v === undefined) delete merged[key];
      return merged;
    });
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => onChange([...items, blankItem(itemFields)]);

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-md border p-2"
          style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-bg, transparent)' }}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--bd-text-faint)' }}
            >
              #{i + 1}
            </span>
            <div className="flex items-center gap-1">
              <IconBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </IconBtn>
              <IconBtn
                label="Move down"
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </IconBtn>
              <IconBtn label="Remove" danger onClick={() => remove(i)}>
                ✕
              </IconBtn>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {itemFields.map((f) => (
              <PropEditor
                key={f.key}
                field={f}
                value={item[f.key]}
                onChange={(v) => update(i, f.key, v)}
              />
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rounded-md border border-dashed px-2 py-1.5 text-[12px] font-medium transition-colors"
        style={{ borderColor: 'var(--bd-border)', color: 'var(--bd-text-soft)' }}
      >
        + Add item
      </button>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  danger,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-5 w-5 items-center justify-center rounded text-[12px] transition-colors disabled:opacity-30"
      style={{ color: danger ? 'var(--bd-danger, #c0392b)' : 'var(--bd-text-soft)' }}
    >
      {children}
    </button>
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
