/**
 * Visual rule builder for the `visibility` axis.
 *
 * The Blueprint DSL supports:
 *   - Leaf predicates:  { field, eq | neq | in | nin | exists | gt | gte | lt | lte }
 *   - Composers:        { and: [...] } | { or: [...] } | { not: {...} }
 *   - Escape hatch:     { rule: 'name' }
 *
 * This editor covers the leaf shapes visually — the 90% case. Complex
 * nested trees (and/or/not) still round-trip through the JSON editor
 * hook (`onFallbackToJson`), so power-users are not blocked.
 *
 * The field dropdown scans the ancestor `form` node for its
 * descendant form-input names, so the user picks a real field instead
 * of typing `$form.email` by hand. Falls back to a text input when no
 * ancestor form exists (e.g. editing a node outside a form context).
 */
import { useMemo } from 'react';
import type { BlueprintNode } from '../state/types';

/** Blueprint's leaf predicate operators. */
const OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'does not equal' },
  { value: 'in', label: 'is one of' },
  { value: 'nin', label: 'is not one of' },
  { value: 'exists', label: 'exists / does not exist' },
  { value: 'gt', label: 'is greater than' },
  { value: 'gte', label: 'is greater or equal' },
  { value: 'lt', label: 'is less than' },
  { value: 'lte', label: 'is less or equal' },
] as const;

type Operator = (typeof OPERATORS)[number]['value'];

/** Atom types that expose a `props.name` we can reference from a rule. */
const NAMED_INPUT_TYPES = new Set([
  'field', 'textarea', 'number', 'select', 'autocomplete',
  'checkbox', 'switch', 'radio', 'date', 'time', 'dateTime',
  'dateRange', 'otp',
]);

/**
 * Collect every named form input under the given root. Yields
 * `$form.<name>` strings ready for use in a VisibilityRule.
 */
function collectFieldRefs(root: BlueprintNode | null): string[] {
  if (!root) return [];
  const out: string[] = [];
  const walk = (n: BlueprintNode) => {
    if (NAMED_INPUT_TYPES.has(n.type)) {
      const name = n.props?.name;
      if (typeof name === 'string' && name) out.push('$form.' + name);
    }
    for (const c of n.children) walk(c);
  };
  walk(root);
  return Array.from(new Set(out));
}

type LeafRule = {
  field: string;
  [op: string]: unknown;
};

/** Guess whether the current rule is a simple single-operator leaf. */
function isLeaf(rule: unknown): rule is LeafRule {
  if (!rule || typeof rule !== 'object') return false;
  const r = rule as Record<string, unknown>;
  if (typeof r.field !== 'string') return false;
  // Any single non-`field` key that's in our operator set makes it a leaf.
  const opKeys = Object.keys(r).filter((k) => k !== 'field');
  return opKeys.length === 1 && OPERATORS.some((op) => op.value === opKeys[0]);
}

function currentOperator(rule: LeafRule): Operator {
  const key = Object.keys(rule).find((k) => k !== 'field');
  return (key ?? 'eq') as Operator;
}

function currentValue(rule: LeafRule): unknown {
  return rule[currentOperator(rule)];
}

/**
 * Serialise the value for the text input. For array-based operators
 * (`in`, `nin`) we join with `, ` so the user types a
 * comma-separated list.
 */
function valueToInput(op: Operator, value: unknown): string {
  if (op === 'in' || op === 'nin') {
    return Array.isArray(value) ? value.map(String).join(', ') : '';
  }
  if (op === 'exists') {
    return value === true ? 'true' : value === false ? 'false' : '';
  }
  if (value === undefined || value === null) return '';
  return String(value);
}

/** Parse the text input back into the operator-appropriate value. */
function inputToValue(op: Operator, raw: string): unknown {
  const trimmed = raw.trim();
  if (op === 'in' || op === 'nin') {
    if (!trimmed) return [];
    return trimmed.split(',').map((s) => tryNumber(s.trim()));
  }
  if (op === 'exists') return trimmed === 'true';
  if (op === 'gt' || op === 'gte' || op === 'lt' || op === 'lte') {
    // Numeric operators try to coerce; fall back to string.
    return tryNumber(trimmed);
  }
  return tryNumber(trimmed);
}

/** Coerce a numeric string to number; else return the original string. */
function tryNumber(s: string): unknown {
  if (s === '') return '';
  if (!Number.isNaN(Number(s)) && s.match(/^-?\d/)) return Number(s);
  return s;
}

const inputBase =
  'w-full rounded-md border px-2.5 py-2 text-[13px] outline-none';
const inputStyle: React.CSSProperties = {
  background: 'var(--bd-item)',
  borderColor: 'var(--bd-border)',
  color: 'var(--bd-text)',
};

export function VisibilityRuleBuilder({
  rule,
  root,
  onChange,
  onFallbackToJson,
}: {
  rule: unknown;
  root: BlueprintNode | null;
  onChange: (next: unknown) => void;
  onFallbackToJson: () => void;
}) {
  const fields = useMemo(() => collectFieldRefs(root), [root]);
  const complex = !isLeaf(rule);

  if (complex) {
    return (
      <div
        className="flex flex-col gap-2 rounded-md border px-3 py-2.5 text-[12px]"
        style={{
          borderColor: 'var(--bd-border-strong)',
          background: 'var(--bd-item)',
          color: 'var(--bd-text-soft)',
        }}
      >
        <span>
          This rule uses <code>and</code> / <code>or</code> / <code>not</code> —
          edit it via the JSON view.
        </span>
        <button
          type="button"
          onClick={onFallbackToJson}
          className="self-start rounded-md border px-2 py-1 text-[12px] transition-colors"
          style={{
            borderColor: 'var(--bd-accent)',
            color: 'var(--bd-accent)',
            background: 'transparent',
          }}
        >
          Edit JSON
        </button>
      </div>
    );
  }

  const leaf = rule as LeafRule;
  const op = currentOperator(leaf);
  const value = currentValue(leaf);

  const patch = (partial: Partial<LeafRule> | { op: Operator; value: unknown }) => {
    if ('op' in partial && 'value' in partial) {
      // Operator swap — drop the old operator key, add the new one.
      const { op: newOp, value: v } = partial;
      onChange({ field: leaf.field, [newOp as string]: v });
      return;
    }
    onChange({ ...leaf, ...partial });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Field picker */}
      <label className="flex flex-col gap-1">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.06em]"
          style={{ color: 'var(--bd-text-soft)' }}
        >
          When this field…
        </span>
        {fields.length > 0 ? (
          <select
            className={inputBase}
            style={inputStyle}
            value={fields.includes(leaf.field) ? leaf.field : ''}
            onChange={(e) => patch({ field: e.target.value })}
          >
            <option value="" disabled>
              — pick a field —
            </option>
            {fields.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            className={inputBase}
            style={inputStyle}
            placeholder="$form.email"
            value={leaf.field}
            onChange={(e) => patch({ field: e.target.value })}
          />
        )}
      </label>

      {/* Operator */}
      <label className="flex flex-col gap-1">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.06em]"
          style={{ color: 'var(--bd-text-soft)' }}
        >
          …matches this condition
        </span>
        <select
          className={inputBase}
          style={inputStyle}
          value={op}
          onChange={(e) => {
            const newOp = e.target.value as Operator;
            const defaultVal =
              newOp === 'in' || newOp === 'nin' ? []
              : newOp === 'exists' ? true
              : value ?? '';
            patch({ op: newOp, value: defaultVal });
          }}
        >
          {OPERATORS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {/* Value */}
      <label className="flex flex-col gap-1">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.06em]"
          style={{ color: 'var(--bd-text-soft)' }}
        >
          Value
        </span>
        {op === 'exists' ? (
          <select
            className={inputBase}
            style={inputStyle}
            value={value === true ? 'true' : 'false'}
            onChange={(e) => patch({ [op]: e.target.value === 'true' })}
          >
            <option value="true">must be present</option>
            <option value="false">must NOT be present</option>
          </select>
        ) : (
          <input
            type="text"
            className={inputBase}
            style={inputStyle}
            placeholder={
              op === 'in' || op === 'nin'
                ? 'e.g. IT, FR, DE (comma-separated)'
                : 'e.g. IT'
            }
            value={valueToInput(op, value)}
            onChange={(e) => patch({ [op]: inputToValue(op, e.target.value) })}
          />
        )}
      </label>
    </div>
  );
}
