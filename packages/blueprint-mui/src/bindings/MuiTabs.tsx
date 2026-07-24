import { Children, useMemo, useState, type ReactNode } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import type { TranslatableString } from '@dashforge/blueprint-core';
import { resolveTranslatableValue, useIntl, useFormValuesSafe } from '@dashforge/blueprint-runtime';

type Item = { value: string; label: TranslatableString; disabled?: boolean };

type Props = {
  items: Item[];
  defaultValue?: string;
  variant?: 'underline' | 'pill';
  orientation?: 'horizontal' | 'vertical';
  keepMounted?: boolean;
  children?: ReactNode;
};

export function MuiTabs({
  items, defaultValue, variant = 'underline', orientation = 'horizontal',
  keepMounted, children,
}: Props) {
  const initial = defaultValue ?? items[0]?.value ?? '';
  const [value, setValue] = useState(initial);
  const panels = Children.toArray(children);
  const intl = useIntl();
  const formValues = useFormValuesSafe();
  const resolvedItems = useMemo(
    () => items.map((it) => ({ ...it, label: resolveTranslatableValue(it.label, intl, formValues) ?? '' })),
    [items, intl, formValues],
  );

  // MUI Tabs offers 'standard' | 'scrollable' | 'fullWidth'. We map
  // our two pill/underline vocab to MUI's 'fullWidth'/'standard' for
  // visual approximation (pill ⇒ fullWidth, underline ⇒ standard).
  const muiVariant = variant === 'pill' ? 'fullWidth' : 'standard';

  return (
    <Box sx={orientation === 'vertical' ? { display: 'flex' } : undefined}>
      <Tabs
        value={value}
        onChange={(_, v) => setValue(v as string)}
        orientation={orientation}
        variant={muiVariant}
        sx={orientation === 'vertical' ? { borderRight: 1, borderColor: 'divider', minWidth: 160 } : { borderBottom: 1, borderColor: 'divider' }}
      >
        {resolvedItems.map((it) => (
          <Tab key={it.value} value={it.value} label={it.label} disabled={it.disabled} />
        ))}
      </Tabs>
      <Box sx={{ flex: 1, py: 2 }}>
        {resolvedItems.map((it, i) => {
          const isActive = it.value === value;
          if (!isActive && !keepMounted) return null;
          return (
            <Box
              key={it.value}
              role="tabpanel"
              hidden={!isActive}
              sx={{ display: isActive ? 'block' : 'none' }}
            >
              {panels[i]}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
