import { useMemo } from 'react';
import { Breadcrumbs } from '@dashforge/tw';
import { useIconRegistry, renderIcon, useTranslatable, resolveTranslatableValue, useIntl, useFormValuesSafe } from '@dashforge/blueprint-runtime';
import type { IconRegistry, TranslatableString } from '@dashforge/blueprint-core';

type Item = {
  id: string;
  label: TranslatableString;
  href?: string;
  current?: boolean;
  disabled?: boolean;
  icon?: string;
};

type Props = {
  items: Item[];
  maxItems?: number;
  itemsBeforeCollapse?: number;
  itemsAfterCollapse?: number;
  ariaLabel?: TranslatableString;
};

// Single useIconRegistry call at the top of the binding; per-item
// icons resolved via a plain function inside the render path. Uses the
// hardened `renderIcon` (try/catches user-supplied render throws) from
// IconContext.
function resolveIconNode(registry: IconRegistry, id: string) {
  const entry = registry.find((i) => i.id === id) ?? null;
  return renderIcon(entry, id, { size: 14, 'aria-hidden': true });
}

export function TwBreadcrumbs({
  items, maxItems, itemsBeforeCollapse, itemsAfterCollapse, ariaLabel,
}: Props) {
  const registry = useIconRegistry();
  const intl = useIntl();
  const formValues = useFormValuesSafe();
  const resolvedAriaLabel = useTranslatable(ariaLabel);
  const resolved = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        label: resolveTranslatableValue(item.label, intl, formValues) ?? '',
        icon: item.icon ? resolveIconNode(registry, item.icon) : undefined,
      })),
    [items, registry, intl, formValues],
  );
  return (
    <Breadcrumbs
      items={resolved}
      maxItems={maxItems}
      itemsBeforeCollapse={itemsBeforeCollapse}
      itemsAfterCollapse={itemsAfterCollapse}
      ariaLabel={resolvedAriaLabel}
    />
  );
}
