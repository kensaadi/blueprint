/**
 * `layoutHint` editor — only surfaced when the selected node's parent
 * is a `grid`. Non-grid children ignore the hint at runtime, so
 * exposing it out of context would be misleading.
 *
 * MVP scope: `size` only (1..12 Bootstrap span). Responsive per-
 * breakpoint editing is exposed via a toggle to keep the default UI
 * compact. Explicit "unset" removes the hint so the JSON export stays
 * clean.
 *
 * Layout pattern (Option B): label + value on top row, slider full-
 * width below. Wider slider = better precision when dragging. Tick
 * marks at 1/2/3/4/6/8/9/12 nudge users toward divisors of 12 (which
 * produce clean grid splits) without preventing arbitrary values.
 */
import { useState } from 'react';
import { Typography } from '@dashforge/tw';
import type { BlueprintNode } from '../state/types';
import { useBuilderDispatch } from '../state/BuilderStateContext';

type Size = NonNullable<BlueprintNode['layoutHint']>['size'];

const BP = ['base', 'sm', 'md', 'lg', 'xl'] as const;

/** Divisors of 12 — the values that produce visually clean grid splits. */
const TICKS = [1, 2, 3, 4, 6, 8, 9, 12] as const;

function isResponsive(v: Size | undefined): v is Exclude<Size, number | undefined> {
  return typeof v === 'object' && v !== null;
}

export function LayoutEditor({ node }: { node: BlueprintNode }) {
  const dispatch = useBuilderDispatch();
  const size = node.layoutHint?.size;
  const [responsive, setResponsive] = useState<boolean>(isResponsive(size));

  const setSize = (next: Size | undefined) => {
    dispatch({
      type: 'setLayoutHint',
      id: node._uid,
      value: next === undefined ? undefined : { size: next },
    });
  };

  const asObject = isResponsive(size) ? size : {};
  const scalar = typeof size === 'number' ? size : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Typography
          variant="caption"
          sx="text-[12px] font-medium uppercase tracking-[0.1em]"
          style={{ color: 'var(--bd-text-faint)' }}
        >
          Column span
        </Typography>
        <div className="flex items-center gap-1">
          <ModeChip
            active={!responsive}
            onClick={() => {
              setResponsive(false);
              if (isResponsive(size)) setSize(size.base ?? size.md ?? undefined);
            }}
          >
            Single
          </ModeChip>
          <ModeChip
            active={responsive}
            onClick={() => {
              setResponsive(true);
              if (typeof size === 'number') setSize({ base: size });
            }}
          >
            Responsive
          </ModeChip>
        </div>
      </div>

      <span className="text-[11px]" style={{ color: 'var(--bd-text-faint)' }}>
        How many of the parent Grid&apos;s 12 columns this node spans.
        Try different values — the canvas updates live.
      </span>

      {!responsive ? (
        <SpanSlider
          value={scalar}
          onChange={(v) => setSize(v)}
          showBreakpointLabel={false}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {BP.map((bp) => (
            <SpanSlider
              key={bp}
              breakpoint={bp}
              showBreakpointLabel
              value={asObject[bp]}
              onChange={(v) => {
                const next: Record<string, number> = { ...asObject };
                if (v === undefined) delete next[bp];
                else next[bp] = v;
                setSize(
                  Object.keys(next).length === 0
                    ? undefined
                    : (next as Exclude<Size, number | undefined>),
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Full-width slider with the label (breakpoint or blank) + value on
 * the row above. The wide slider gives more precision when dragging;
 * the tick marks encourage divisors of 12 without forcing them.
 */
function SpanSlider({
  breakpoint,
  showBreakpointLabel,
  value,
  onChange,
}: {
  breakpoint?: (typeof BP)[number];
  showBreakpointLabel: boolean;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  // Deterministic id so multiple sliders on the page each bind to their
  // own datalist (avoids the "same tick track for every slider" bug
  // that happens when several ranges share one datalist id).
  const listId = `spanticks-${breakpoint ?? 'single'}`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        {showBreakpointLabel && breakpoint ? (
          <span
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: 'var(--bd-text-soft)' }}
          >
            {breakpoint}
          </span>
        ) : (
          <span />
        )}
        <span
          className="font-mono text-[13px]"
          style={{
            color: value === undefined ? 'var(--bd-text-faint)' : 'var(--bd-text)',
          }}
        >
          {value ?? '—'}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={12}
        step={1}
        list={listId}
        value={value ?? 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(n === 0 ? undefined : n);
        }}
        className="w-full"
      />
      {/*
        Native tick marks via <datalist>. Rendered by the browser as
        small notches under the slider thumb rail — supported in all
        evergreen browsers. Zero JS cost, screen readers announce them.
      */}
      <datalist id={listId}>
        {TICKS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
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
