/**
 * Schema tests for the calendar atom (Tier C).
 */
import { describe, expect, test } from 'vitest';
import { ATOM_PROP_SCHEMAS } from './atoms';

describe('schema — calendar', () => {
  const s = ATOM_PROP_SCHEMAS.calendar;

  test('accepts empty {}', () => {
    expect(s.safeParse({}).success).toBe(true);
  });

  test('accepts the full surface', () => {
    expect(s.safeParse({
      defaultValue: '2026-06-22',
      defaultMonth: 6,
      defaultYear: 2026,
      minDate: '2026-06-01',
      maxDate: '2026-06-30',
      disabledDates: ['2026-06-02', '2026-06-15'],
      weekStartDay: 1,
      locale: 'it-IT',
      today: '2026-06-22',
      disabled: false,
      autoFocus: false,
      ariaLabel: 'event calendar',
    }).success).toBe(true);
  });

  test('accepts defaultValue=null (explicit no-selection)', () => {
    expect(s.safeParse({ defaultValue: null }).success).toBe(true);
  });

  test('rejects malformed ISO dates', () => {
    expect(s.safeParse({ defaultValue: '06-22-2026' }).success).toBe(false);
    expect(s.safeParse({ minDate: '2026/06/01' }).success).toBe(false);
    expect(s.safeParse({ maxDate: 'tomorrow' }).success).toBe(false);
    expect(s.safeParse({ disabledDates: ['2026-06-02', 'bad'] }).success).toBe(false);
  });

  test('accepts every weekStartDay value 0..6', () => {
    for (const d of [0, 1, 2, 3, 4, 5, 6] as const) {
      expect(s.safeParse({ weekStartDay: d }).success).toBe(true);
    }
  });

  test('rejects weekStartDay out of range', () => {
    expect(s.safeParse({ weekStartDay: 7 }).success).toBe(false);
    expect(s.safeParse({ weekStartDay: -1 }).success).toBe(false);
  });

  test('rejects defaultMonth out of 1..12', () => {
    expect(s.safeParse({ defaultMonth: 0 }).success).toBe(false);
    expect(s.safeParse({ defaultMonth: 13 }).success).toBe(false);
  });

  test('rejects defaultYear out of 1900..9999', () => {
    expect(s.safeParse({ defaultYear: 1899 }).success).toBe(false);
    expect(s.safeParse({ defaultYear: 10000 }).success).toBe(false);
  });

  test('rejects function-shaped predicates (isDateDisabled deliberately excluded)', () => {
    // The lib exposes isDateDisabled? but we don't surface it — the
    // strict() schema rejects unknown keys so callers can't smuggle
    // functions into a JSON contract.
    expect(s.safeParse({ isDateDisabled: () => true }).success).toBe(false);
  });

  test('rejects unknown keys (strict)', () => {
    expect(s.safeParse({ extra: 'nope' }).success).toBe(false);
  });
});
