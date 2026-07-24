import { useState } from 'react';
import { Calendar } from '@dashforge/tw';
import type { TranslatableString } from '@dashforge/blueprint-core';
import { useTranslatable } from '@dashforge/blueprint-runtime';

type ISODate = string;
type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type Props = {
  defaultValue?: ISODate | null;
  defaultMonth?: number;
  defaultYear?: number;
  minDate?: ISODate;
  maxDate?: ISODate;
  disabledDates?: ReadonlyArray<ISODate>;
  weekStartDay?: WeekDay;
  locale?: string;
  today?: ISODate;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: TranslatableString;
};

/**
 * Defaults-only uncontrolled wrapper. State lives here; consumer
 * who wants reactivity to selection should slot-override this node.
 */
export function TwCalendar({
  defaultValue, defaultMonth, defaultYear,
  minDate, maxDate, disabledDates,
  weekStartDay, locale, today,
  disabled, autoFocus, ariaLabel,
}: Props) {
  const [value, setValue] = useState<ISODate | null | undefined>(defaultValue);
  const resolvedAriaLabel = useTranslatable(ariaLabel);
  return (
    <Calendar
      value={value}
      onChange={setValue}
      defaultMonth={defaultMonth}
      defaultYear={defaultYear}
      minDate={minDate}
      maxDate={maxDate}
      disabledDates={disabledDates}
      weekStartDay={weekStartDay}
      locale={locale}
      today={today}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-label={resolvedAriaLabel}
    />
  );
}
