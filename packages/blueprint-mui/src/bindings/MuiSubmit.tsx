import { Button } from '@dashforge/ui';
import type { TranslatableString } from '@dashforge/blueprint-core';
import { useTranslatable } from '@dashforge/blueprint-runtime';
import { useMuiFormCtx } from '../formContext';

type Props = {
  label?: TranslatableString;
  variant?: 'solid' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
};

const SIZE_MAP = { sm: 'small', md: 'medium', lg: 'large' } as const;

export function MuiSubmit({
  label,
  variant = 'solid',
  size,
  fullWidth,
}: Props) {
  const ctx = useMuiFormCtx();
  const resolvedLabel = useTranslatable(label) ?? 'Submit';
  return (
    <Button
      type="submit"
      variant={variant === 'outline' ? 'outlined' : 'contained'}
      color="primary"
      size={size ? SIZE_MAP[size] : undefined}
      fullWidth={fullWidth}
      disabled={ctx?.submitting}
    >
      {ctx?.submitting ? 'Saving…' : resolvedLabel}
    </Button>
  );
}
