import { Children, useMemo, type ReactNode } from 'react';
import { Accordion } from '@dashforge/tw';
import type { TranslatableString } from '@dashforge/blueprint-core';
import { resolveTranslatableValue, useIntl, useFormValuesSafe } from '@dashforge/blueprint-runtime';

type Item = { value: string; header: TranslatableString; disabled?: boolean };

type SingleProps = {
  type?: 'single';
  items: Item[];
  defaultValue?: string;
  collapsible?: boolean;
  children?: ReactNode;
};

type MultipleProps = {
  type: 'multiple';
  items: Item[];
  defaultValue?: string[];
  children?: ReactNode;
};

type Props = SingleProps | MultipleProps;

export function TwAccordion(props: Props) {
  const { items, children } = props;
  const panels = Children.toArray(children);
  const intl = useIntl();
  const formValues = useFormValuesSafe();
  const accordionItems = useMemo(
    () =>
      items.map((item, i) => ({
        value: item.value,
        header: resolveTranslatableValue(item.header, intl, formValues) ?? '',
        content: panels[i] ?? null,
        disabled: item.disabled,
      })),
    [items, intl, formValues, panels],
  );

  if (props.type === 'multiple') {
    return (
      <Accordion
        type="multiple"
        items={accordionItems}
        defaultValue={props.defaultValue}
      />
    );
  }
  return (
    <Accordion
      type="single"
      items={accordionItems}
      defaultValue={props.defaultValue}
      collapsible={props.collapsible ?? true}
    />
  );
}
