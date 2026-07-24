import { Button } from '@dashforge/tw';
import type { TranslatableString } from '@dashforge/blueprint-core';
import { useTranslatable } from '@dashforge/blueprint-runtime';
import { useTwFormCtx } from '../formContext';

type Props = {
  label?: TranslatableString;
  variant?: 'solid' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

export function TwSubmit({ label, variant = 'solid', size, fullWidth }: Props) {
  const ctx = useTwFormCtx();
  const resolvedLabel = useTranslatable(label) ?? 'Submit';
  return (
    <Button
      type="submit"
      variant={variant === 'outline' ? 'outline' : 'solid'}
      color="primary"
      size={size}
      fullWidth={fullWidth}
      disabled={ctx?.submitting}
    >
      {ctx?.submitting ? 'Saving…' : resolvedLabel}
    </Button>
  );
}
