/**
 * State axes editor — surfaces the three Blueprint envelope-level
 * axes (Decision #17) plus the envelope `id` and the `slots` map.
 *
 * Axes rendered:
 *   - Node id       — user-facing identifier for `<DashBlueprint forms>`
 *     and `slots` lookup; especially important on `form` where the
 *     validator REQUIRES `node.id` (ATOMS_REQUIRING_ID).
 *   - Visibility    — 3-way (default / hidden / rule). Rule mode uses a
 *     JSON textarea until a click-to-build rule editor lands (Phase 3d).
 *   - Disabled      — static structural disable (boolean).
 *   - Access        — RBAC requirement (resource + action + fallback).
 *   - Slots         — JSON textarea for slot overrides. Deferred: same
 *     rationale as visibility rules.
 *
 * Fine-grained rule builders and slot pickers land in Phase 3d.
 * Today's editors are functional; the JSON textarea gives designers a
 * working escape hatch even before the visual builders exist.
 */
import { useState } from 'react';
import { Typography } from '@dashforge/tw';
import { useBuilderDispatch, useBuilderState } from '../state/BuilderStateContext';
import type { BlueprintNode } from '../state/types';
import { FieldHint } from './FieldHint';
import { hintFor, placeholderFor, JSON_EXAMPLES } from './fieldHints';
import { VisibilityRuleBuilder } from './VisibilityRuleBuilder';
import { InspectorSwitch } from '../primitives/InspectorSwitch';

type Props = { node: BlueprintNode };

const labelClass =
  'flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]';
const inputBase =
  'w-full rounded-md border px-2.5 py-2 text-[13px] outline-none';
const inputStyle: React.CSSProperties = {
  background: 'var(--bd-item)',
  borderColor: 'var(--bd-border)',
  color: 'var(--bd-text)',
};

export function StateAxesEditor({ node }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <NodeIdField node={node} />
      <VisibilityField node={node} />
      <DisabledField node={node} />
      <AccessField node={node} />
      <SlotsField node={node} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Node envelope id — critical for `form` (validator-required)
// ─────────────────────────────────────────────────────────────────

function NodeIdField({ node }: Props) {
  const dispatch = useBuilderDispatch();
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass} style={{ color: 'var(--bd-text-soft)' }}>
        nodeId
        <FieldHint text={hintFor('nodeId')} />
      </span>
      <input
        type="text"
        className={inputBase}
        style={inputStyle}
        placeholder={placeholderFor('nodeId')}
        value={node.nodeId ?? ''}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (v) dispatch({ type: 'setNodeId', id: node._uid, newId: v });
        }}
      />
      <span
        className="text-[11px] leading-snug"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        Envelope identifier used by <code>forms</code>, <code>slots</code>,
        and diagnostics. Required for <code>form</code>.
      </span>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────
// Visibility — boolean | VisibilityRule
// ─────────────────────────────────────────────────────────────────

type VisibilityMode = 'default' | 'hidden' | 'visible' | 'rule';

function currentVisibilityMode(v: BlueprintNode['visibility']): VisibilityMode {
  if (v === undefined) return 'default';
  if (v === false) return 'hidden';
  if (v === true) return 'visible';
  return 'rule';
}

function VisibilityField({ node }: Props) {
  const dispatch = useBuilderDispatch();
  const { contract } = useBuilderState();
  const mode = currentVisibilityMode(node.visibility);
  // Session-local toggle: when true, force the JSON textarea instead
  // of the visual builder (for and/or/not composites or manual edits).
  const [forceJson, setForceJson] = useState(false);

  const setMode = (next: VisibilityMode) => {
    let value: BlueprintNode['visibility'] | undefined;
    switch (next) {
      case 'default': value = undefined; break;
      case 'hidden':  value = false; break;
      case 'visible': value = true; break;
      case 'rule':    value = typeof node.visibility === 'object'
        ? node.visibility
        : { field: '$form.example', eq: 'value' };
        break;
    }
    dispatch({ type: 'setNodeAxis', id: node._uid, axis: 'visibility', value });
    setForceJson(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className={labelClass} style={{ color: 'var(--bd-text-soft)' }}>
        visibility
        <FieldHint text={hintFor('visibility')} />
      </span>
      <div className="flex flex-wrap gap-1">
        {(['default', 'visible', 'hidden', 'rule'] as const).map((m) => (
          <ModeChip key={m} active={mode === m} onClick={() => setMode(m)}>
            {m}
          </ModeChip>
        ))}
      </div>
      {mode === 'rule' && !forceJson && (
        <div className="flex flex-col gap-2">
          <VisibilityRuleBuilder
            rule={node.visibility}
            root={contract.root}
            onChange={(v) =>
              dispatch({ type: 'setNodeAxis', id: node._uid, axis: 'visibility', value: v })
            }
            onFallbackToJson={() => setForceJson(true)}
          />
          <button
            type="button"
            onClick={() => setForceJson(true)}
            className="self-start text-[11px] underline underline-offset-2"
            style={{ color: 'var(--bd-text-faint)' }}
          >
            Advanced — edit as JSON
          </button>
        </div>
      )}
      {mode === 'rule' && forceJson && (
        <div className="flex flex-col gap-2">
          <JsonEditor
            label="Rule (JSON)"
            placeholder={JSON_EXAMPLES.visibilityRule}
            value={node.visibility}
            onChange={(v) =>
              dispatch({ type: 'setNodeAxis', id: node._uid, axis: 'visibility', value: v })
            }
          />
          <button
            type="button"
            onClick={() => setForceJson(false)}
            className="self-start text-[11px] underline underline-offset-2"
            style={{ color: 'var(--bd-text-faint)' }}
          >
            Back to visual editor
          </button>
        </div>
      )}
      <span
        className="text-[11px] leading-snug"
        style={{ color: 'var(--bd-text-faint)' }}
      >
        Default = always visible. Rules check the form values at render time.
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Disabled — boolean only (dynamic disable → customNodes)
// ─────────────────────────────────────────────────────────────────

function DisabledField({ node }: Props) {
  const dispatch = useBuilderDispatch();
  // UI inverts the sense: switch shows "Enabled" (positive framing),
  // default is ON (enabled). Storing `disabled: true` in the contract
  // means the switch is OFF. `disabled: undefined` means switch is ON.
  const enabled = node.disabled !== true;
  return (
    <div className="flex flex-col gap-1.5">
      <span className={labelClass} style={{ color: 'var(--bd-text-soft)' }}>
        enabled
        <FieldHint text={hintFor('disabled')} />
      </span>
      <InspectorSwitch
        checked={enabled}
        onChange={(next) =>
          dispatch({
            type: 'setNodeAxis',
            id: node._uid,
            axis: 'disabled',
            value: next ? undefined : true,
          })
        }
        label={enabled ? 'Enabled' : 'Disabled'}
        description={
          enabled
            ? 'Interactive by default.'
            : 'Statically disabled — the node ignores user input.'
        }
        ariaLabel="Node enabled state"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Access — AccessRule { resource, action, onUnauthorized? }
// ─────────────────────────────────────────────────────────────────

function AccessField({ node }: Props) {
  const dispatch = useBuilderDispatch();
  const enabled = node.access !== undefined;
  const cur = node.access ?? { resource: '', action: '' };

  const patch = (delta: Partial<NonNullable<BlueprintNode['access']>>) => {
    dispatch({
      type: 'setNodeAxis',
      id: node._uid,
      axis: 'access',
      value: { ...cur, ...delta },
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <span className={labelClass} style={{ color: 'var(--bd-text-soft)' }}>
        access (RBAC)
        <FieldHint text={hintFor('access')} />
      </span>
      <InspectorSwitch
        checked={enabled}
        onChange={(next) =>
          dispatch({
            type: 'setNodeAxis',
            id: node._uid,
            axis: 'access',
            value: next ? { resource: '', action: 'read' } : undefined,
          })
        }
        label={enabled ? 'Gated' : 'No requirement'}
        description={
          enabled
            ? 'Requires the resource + action pair below.'
            : 'Any role can render this node.'
        }
        ariaLabel="RBAC gate toggle"
      />
      {enabled && (
        <div className="flex flex-col gap-2 mt-1">
          <MiniInput
            label="resource"
            hint={hintFor('access.resource')}
            placeholder={placeholderFor('access.resource')}
            value={cur.resource}
            onChange={(v) => patch({ resource: v })}
          />
          <MiniInput
            label="action"
            hint={hintFor('access.action')}
            placeholder={placeholderFor('access.action')}
            value={cur.action}
            onChange={(v) => patch({ action: v })}
          />
          <label className="flex flex-col gap-1">
            <span className={labelClass} style={{ color: 'var(--bd-text-soft)' }}>
              onUnauthorized
              <FieldHint text={hintFor('access.onUnauthorized')} />
            </span>
            <select
              className={inputBase}
              style={inputStyle}
              value={cur.onUnauthorized ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                patch({
                  onUnauthorized: v === '' ? undefined : (v as 'hide' | 'disable' | 'readonly'),
                });
              }}
            >
              <option value="">— default —</option>
              <option value="hide">hide</option>
              <option value="disable">disable</option>
              <option value="readonly">readonly</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Slots — Record<slotName, BlueprintNode | BlueprintNode[]>
//
// The visual builder only handles the SIMPLE shape (each value is a
// single non-array BlueprintNode with no children / nested slots) —
// that covers 90%+ of real-world usage (a customFooter, a
// customEmptyState, a customHeader…). Anything more elaborate (array
// values, deep nesting) transparently falls back to the JSON editor
// so power users are never blocked.
// ─────────────────────────────────────────────────────────────────

type SimpleOverride = { type: string; id: string };

function isSimpleShape(v: unknown): v is Record<string, SimpleOverride> {
  if (v === undefined || v === null) return true;
  if (typeof v !== 'object' || Array.isArray(v)) return false;
  return Object.values(v as Record<string, unknown>).every((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
    const e = entry as Record<string, unknown>;
    // Reject if it looks like a deep tree — children with content, or
    // nested slots. `props` can be present but must be a plain object
    // with no nested BlueprintNode structure worth surfacing.
    const children = e.children;
    const hasChildren =
      Array.isArray(children) && (children as unknown[]).length > 0;
    if (hasChildren) return false;
    if (e.slots !== undefined) return false;
    return typeof e.type === 'string' && typeof e.id === 'string';
  });
}

function SlotsField({ node }: Props) {
  const dispatch = useBuilderDispatch();
  const [mode, setMode] = useState<'visual' | 'json'>(() =>
    isSimpleShape(node.slots) ? 'visual' : 'json',
  );
  const setSlots = (v: unknown) =>
    dispatch({ type: 'setNodeAxis', id: node._uid, axis: 'slots', value: v });

  // If the current value shape is incompatible with the visual editor,
  // pin the mode to `json` and disable the toggle — safer than showing
  // an editor that would silently drop data.
  const canVisual = isSimpleShape(node.slots);
  const effectiveMode: 'visual' | 'json' = canVisual ? mode : 'json';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={labelClass} style={{ color: 'var(--bd-text-soft)' }}>
          Custom content areas
          <FieldHint text={hintFor('slots')} />
        </span>
        <div className="flex items-center gap-1">
          <ModeChip
            active={effectiveMode === 'visual'}
            onClick={() => canVisual && setMode('visual')}
          >
            Visual
          </ModeChip>
          <ModeChip active={effectiveMode === 'json'} onClick={() => setMode('json')}>
            JSON
          </ModeChip>
        </div>
      </div>

      {effectiveMode === 'visual' ? (
        <SlotsVisualBuilder
          value={(node.slots as Record<string, SimpleOverride> | undefined) ?? undefined}
          onChange={setSlots}
        />
      ) : (
        <>
          {!canVisual && (
            <span className="text-[11px]" style={{ color: 'var(--bd-text-faint)' }}>
              Slots have an advanced shape (array values or nested tree) —
              editing as JSON.
            </span>
          )}
          <JsonEditor
            label=""
            hintKey="slots"
            placeholder={JSON_EXAMPLES.slots}
            value={node.slots}
            onChange={setSlots}
          />
        </>
      )}
    </div>
  );
}

function SlotsVisualBuilder({
  value,
  onChange,
}: {
  value: Record<string, SimpleOverride> | undefined;
  onChange: (v: unknown) => void;
}) {
  const entries = value ? Object.entries(value) : [];
  const [draft, setDraft] = useState<{ key: string; type: string; id: string } | null>(
    null,
  );

  const remove = (key: string) => {
    if (!value) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [key]: _, ...rest } = value;
    onChange(Object.keys(rest).length === 0 ? undefined : rest);
  };

  const commit = () => {
    if (!draft) return;
    const key = draft.key.trim();
    const type = draft.type.trim();
    const id = draft.id.trim() || `${type}-${Math.random().toString(36).slice(2, 8)}`;
    if (!key || !type) return;
    onChange({
      ...(value ?? {}),
      [key]: { type, id, props: {}, children: [] },
    });
    setDraft(null);
  };

  return (
    <div className="flex flex-col gap-2">
      {entries.length === 0 && !draft && (
        <span className="text-[12px]" style={{ color: 'var(--bd-text-faint)' }}>
          No slots defined yet.
        </span>
      )}
      {entries.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {entries.map(([key, entry]) => (
            <div
              key={key}
              className="flex items-center gap-2 rounded-md border px-2.5 py-1.5"
              style={{
                borderColor: 'var(--bd-border)',
                background: 'var(--bd-item)',
              }}
            >
              <span
                className="font-mono text-[12px]"
                style={{ color: 'var(--bd-text)' }}
              >
                {key}
              </span>
              <span style={{ color: 'var(--bd-text-faint)' }}>→</span>
              <span
                className="font-mono text-[12px]"
                style={{ color: 'var(--bd-accent)' }}
              >
                {entry.type}
              </span>
              <span
                className="ml-auto font-mono text-[11px]"
                style={{ color: 'var(--bd-text-faint)' }}
              >
                #{entry.id}
              </span>
              <button
                type="button"
                onClick={() => remove(key)}
                className="rounded p-1"
                style={{ color: 'var(--bd-text-faint)' }}
                aria-label={`Remove slot ${key}`}
              >
                <i className="ti ti-x text-[13px]" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}

      {draft ? (
        <div
          className="flex flex-col gap-2 rounded-md border p-2.5"
          style={{ borderColor: 'var(--bd-border)', background: 'var(--bd-item)' }}
        >
          {/*
            Two related fields (slot key + component type) share a
            side-by-side 6/6 row so the eye reads them as a pair
            ("this slot key binds to this component type"). The Id
            drops to a full-width row underneath because it's optional
            and mechanically less related — the slot is defined by the
            first pair; the id is an implementation detail.
          */}
          <div className="grid grid-cols-2 gap-2">
            <MiniInput
              label="Slot key"
              value={draft.key}
              onChange={(v) => setDraft({ ...draft, key: v })}
              placeholder="footer"
            />
            <MiniInput
              label="Component type"
              value={draft.type}
              onChange={(v) => setDraft({ ...draft, type: v })}
              placeholder="customFooter"
            />
          </div>
          <MiniInput
            label="Id (optional)"
            value={draft.id}
            onChange={(v) => setDraft({ ...draft, id: v })}
            placeholder="auto"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-md px-2.5 py-1 text-[12px]"
              style={{ color: 'var(--bd-text-soft)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={!draft.key.trim() || !draft.type.trim()}
              className="rounded-md px-2.5 py-1 text-[12px] font-medium disabled:opacity-40"
              style={{ background: 'var(--bd-accent)', color: 'white' }}
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDraft({ key: '', type: '', id: '' })}
          className="self-start rounded-md border border-dashed px-2.5 py-1.5 text-[12px]"
          style={{ borderColor: 'var(--bd-border-strong)', color: 'var(--bd-text-soft)' }}
        >
          <i className="ti ti-plus mr-1 text-[13px]" aria-hidden />
          Add slot
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

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

function MiniInput({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass} style={{ color: 'var(--bd-text-soft)' }}>
        {label}
        <FieldHint text={hint} />
      </span>
      <input
        type="text"
        className={inputBase}
        style={inputStyle}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/**
 * JSON textarea — parses on blur so intermediate typing (invalid JSON)
 * never destroys the reducer state. Invalid JSON is retained in the
 * local editor buffer with an inline error message; the stored value
 * only updates once parsing succeeds.
 */
function JsonEditor({
  label,
  value,
  onChange,
  hint,
  hintKey,
  placeholder,
}: {
  label: string;
  value: unknown;
  onChange: (v: unknown) => void;
  hint?: string;
  /** Optional key to look up in the shared hint dictionary. */
  hintKey?: string;
  /** Example JSON shown while the textarea is empty. */
  placeholder?: string;
}) {
  const initial = value === undefined ? '' : JSON.stringify(value, null, 2);
  const dictHint = hintKey ? hintFor(hintKey) : undefined;
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass} style={{ color: 'var(--bd-text-soft)' }}>
        {label}
        <FieldHint text={dictHint} />
      </span>
      <textarea
        // uncontrolled — parse only when the user finishes editing.
        // `key` forces a reset when the store swaps the value from
        // outside (e.g. mode-chip switch), which is the only time the
        // designer expects the buffer to be discarded.
        key={initial}
        defaultValue={initial}
        placeholder={placeholder}
        className={inputBase + ' font-mono'}
        style={{ ...inputStyle, minHeight: 140 }}
        onBlur={(e) => {
          const raw = e.target.value.trim();
          if (raw === '') return onChange(undefined);
          try {
            onChange(JSON.parse(raw));
          } catch {
            // Silent — the buffer stays with the invalid text so the
            // user can keep editing. Diagnostics for invalid JSON land
            // with the strict-mode validator UI in Phase 3d.
          }
        }}
      />
      {hint && (
        <Typography
          variant="caption"
          sx="text-[11px] leading-snug"
          style={{ color: 'var(--bd-text-faint)' }}
        >
          {hint}
        </Typography>
      )}
    </label>
  );
}
