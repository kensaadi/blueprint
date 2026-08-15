import { useMemo } from 'react';
import { Breadcrumbs, Link, Typography } from '@mui/material';
import { useIconRegistry, renderIcon, useTranslatable, resolveTranslatableValue, useIntl, useFormValuesSafe, useResolvedList } from '@dashforge/blueprint-runtime';
import type { IconRegistry, ListProp, TranslatableString } from '@dashforge/blueprint-core';

type Item = {
  id: string;
  label: TranslatableString;
  href?: string;
  current?: boolean;
  disabled?: boolean;
  icon?: string;
};

type Props = {
  items: ListProp<Item>;
  maxItems?: number;
  itemsBeforeCollapse?: number;
  itemsAfterCollapse?: number;
  ariaLabel?: TranslatableString;
};

// Uses the hardened `renderIcon` (try/catches user-supplied render
// throws) from IconContext. Local alias to keep the per-item resolver
// concise inside the map below.
function resolveIconNode(registry: IconRegistry, id: string) {
  const entry = registry.find((i) => i.id === id) ?? null;
  return renderIcon(entry, id, { size: 14, 'aria-hidden': true });
}

export function MuiBreadcrumbs({
  items, maxItems = 0, itemsBeforeCollapse = 1, itemsAfterCollapse = 1, ariaLabel,
}: Props) {
  const registry = useIconRegistry();
  const intl = useIntl();
  const formValues = useFormValuesSafe();
  const resolvedAriaLabel = useTranslatable(ariaLabel) ?? 'breadcrumb';
  const list = useResolvedList(items);
  const resolvedItems = useMemo(
    () =>
      list.map((item) => ({
        ...item,
        label: resolveTranslatableValue(item.label, intl, formValues) ?? '',
      })),
    [list, intl, formValues],
  );

  return (
    <Breadcrumbs
      maxItems={maxItems > 0 ? maxItems : 999}
      itemsBeforeCollapse={itemsBeforeCollapse}
      itemsAfterCollapse={itemsAfterCollapse}
      aria-label={resolvedAriaLabel}
    >
      {resolvedItems.map((item) => {
        const iconNode = item.icon ? resolveIconNode(registry, item.icon) : null;
        const body = (
          <>
            {iconNode && (
              <span style={{ display: 'inline-flex', verticalAlign: '-2px', marginRight: 4 }}>
                {iconNode}
              </span>
            )}
            {item.label}
          </>
        );
        if (item.current) {
          return (
            <Typography key={item.id} color="text.primary" aria-current="page">
              {body}
            </Typography>
          );
        }
        if (item.disabled || !item.href) {
          return <span key={item.id}>{body}</span>;
        }
        return (
          <Link key={item.id} href={item.href} underline="hover" color="inherit">
            {body}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
