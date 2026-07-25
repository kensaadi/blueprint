/**
 * InspectorSwitch — small standalone toggle for the Builder Inspector.
 *
 * `@dashforge/tw`'s `<Switch>` is form-bridge-integrated (requires
 * `name`, expects DashFormProvider ancestry). The Inspector doesn't
 * live inside a form context, so we roll a purely presentational
 * toggle here. Zero dependencies beyond React + our theme tokens.
 *
 * Semantic guarantees:
 *   - `checked` is the display state (on = right, off = left)
 *   - `onChange(next)` fires with the new display state
 *   - The consumer decides how `checked` maps to the underlying data
 *     (e.g. for a "Disabled" axis rendered as "Enabled" switch, on
 *     means data-disabled === undefined; off means data-disabled === true)
 *
 * A11y: rendered as `role="switch"` with `aria-checked`. Native focus
 * ring via `:focus-visible`. Click AND space/enter toggle.
 */
import type { KeyboardEvent, ReactNode } from 'react';

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Label rendered to the right of the track. */
  label?: ReactNode;
  /** Optional supporting text under the label. */
  description?: ReactNode;
  ariaLabel?: string;
};

const TRACK_WIDTH = 34;
const TRACK_HEIGHT = 20;
const KNOB_SIZE = 16;
const KNOB_INSET = 2;

export function InspectorSwitch({
  checked,
  onChange,
  disabled,
  label,
  description,
  ariaLabel,
}: Props) {
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled) onChange(!checked);
    }
  };

  return (
    <div className="flex items-start gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={onKey}
        className="relative shrink-0 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-1"
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          background: checked ? 'var(--bd-accent)' : 'var(--bd-border-strong)',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span
          className="absolute rounded-full transition-transform"
          style={{
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            top: KNOB_INSET,
            left: KNOB_INSET,
            transform: checked
              ? `translateX(${TRACK_WIDTH - KNOB_SIZE - KNOB_INSET * 2}px)`
              : 'translateX(0)',
            background: 'white',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <span
              className="text-[12px] font-medium leading-tight"
              style={{ color: 'var(--bd-text)' }}
            >
              {label}
            </span>
          )}
          {description && (
            <span
              className="text-[11px] leading-snug"
              style={{ color: 'var(--bd-text-faint)' }}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
