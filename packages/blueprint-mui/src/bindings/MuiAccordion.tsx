import { Children, useMemo, useState, type ReactNode } from 'react';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import type { TranslatableString } from '@dashforge/blueprint-core';
import { resolveTranslatableValue, useIntl, useFormValuesSafe } from '@dashforge/blueprint-runtime';

// Inline chevron — avoids the @mui/icons-material dep.
const ExpandMoreIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
  </svg>
);

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

export function MuiAccordion(props: Props) {
  const { items, children } = props;
  const panels = Children.toArray(children);
  const intl = useIntl();
  const formValues = useFormValuesSafe();
  const resolvedItems = useMemo(
    () => items.map((it) => ({ ...it, header: resolveTranslatableValue(it.header, intl, formValues) ?? '' })),
    [items, intl, formValues],
  );
  const isMultiple = props.type === 'multiple';
  const collapsible = !isMultiple ? (props.collapsible ?? true) : true;

  const initialOpen = isMultiple
    ? new Set(props.defaultValue ?? [])
    : new Set(props.defaultValue ? [props.defaultValue] : []);

  const [open, setOpen] = useState<Set<string>>(initialOpen);

  const toggle = (value: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        if (!isMultiple && !collapsible) return prev; // refuse to close
        next.delete(value);
      } else {
        if (!isMultiple) next.clear();
        next.add(value);
      }
      return next;
    });
  };

  return (
    <>
      {resolvedItems.map((it, i) => (
        <Accordion
          key={it.value}
          expanded={open.has(it.value)}
          onChange={() => toggle(it.value)}
          disabled={it.disabled}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {it.header}
          </AccordionSummary>
          <AccordionDetails>{panels[i]}</AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}
