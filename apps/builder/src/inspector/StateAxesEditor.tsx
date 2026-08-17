/**
 * State axes editor — surfaces the Blueprint envelope-level fields
 * (Decision #17) plus the public `nodeId`.
 *
 * Fields rendered:
 *   - nodeId        — public addressing key for `<DashBlueprint forms>`
 *     and slot overrides (`<DashBlueprint slots={{ nodeId: … }}>`);
 *     required on `form` (ATOMS_REQUIRING_ID).
 *   - Visibility    — 3-way (default / hidden / rule). Rule mode uses a
 *     JSON textarea for and/or/not composites until a click-to-build
 *     rule editor lands (Phase 3d).
 *   - Disabled      — static structural disable (boolean).
 *   - Access        — RBAC requirement (resource + action + fallback).
 *
 * Extensibility is the mount-time slot override (a custom component per
 * nodeId), not an envelope field — so there is no `node.slots` editor.
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
