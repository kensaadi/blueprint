import { Children, useMemo, type ReactNode } from 'react';
import { Tabs } from '@dashforge/tw';
import type { TranslatableString } from '@dashforge/blueprint-core';
import { resolveTranslatableValue, useIntl, useFormValuesSafe } from '@dashforge/blueprint-runtime';

type Item = { value: string; label: TranslatableString; disabled?: boolean };

type Props = {
  items: Item[];
  defaultValue?: string;
  variant?: 'underline' | 'pill';
  orientation?: 'horizontal' | 'vertical';
  keepMounted?: boolean;
  /** Each child becomes the panel for items[i] (paired by index). */
  children?: ReactNode;
};

export function TwTabs({
  items, defaultValue, variant = 'underline', orientation = 'horizontal',
  keepMounted, children,
}: Props) {
  const panels = Children.toArray(children);
  const intl = useIntl();
  const formValues = useFormValuesSafe();
  const tabItems = useMemo(
    () =>
      items.map((item, i) => ({
        value: item.value,
        label: resolveTranslatableValue(item.label, intl, formValues) ?? '',
        content: panels[i] ?? null,
        disabled: item.disabled,
      })),
    [items, intl, formValues, panels],
  );
  return (
    <Tabs
      items={tabItems}
      defaultValue={defaultValue ?? items[0]?.value}
      variant={variant}
      orientation={orientation}
      keepMounted={keepMounted}
    />
  );
}
