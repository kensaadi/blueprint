import type { TranslatableString } from '@dashforge/blueprint-core';
import { useIcon, renderIcon, useTranslatable } from '@dashforge/blueprint-runtime';

type Props = {
  icon?: string;
  ariaLabel?: TranslatableString;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
};

const BOX: Record<'sm' | 'md' | 'lg', { box: string; px: number }> = {
  sm: { box: 'h-7 w-7', px: 14 },
  md: { box: 'h-9 w-9', px: 18 },
  lg: { box: 'h-10 w-10', px: 22 },
};

const VARIANT: Record<'solid' | 'outline' | 'ghost', string> = {
  solid: 'bg-neutral-900 text-white hover:bg-neutral-700',
  outline: 'border border-neutral-300 text-neutral-800 hover:bg-neutral-50',
  ghost: 'text-neutral-700 hover:bg-neutral-100',
};

export function TwIconButton({
  icon,
  ariaLabel,
  variant = 'solid',
  size = 'md',
  disabled,
}: Props) {
  const entry = useIcon(icon);
  const sizing = BOX[size];
  const resolvedAriaLabel = useTranslatable(ariaLabel);

  return (
    <button
      type="button"
      aria-label={resolvedAriaLabel}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md transition ${sizing.box} ${VARIANT[variant]} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {renderIcon(entry, icon, { size: sizing.px, 'aria-hidden': true })}
    </button>
  );
}
