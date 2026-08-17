import { describe, test, expect } from 'vitest';
import { ATOM_PROP_SCHEMAS } from './atoms';

/**
 * `field` declarative validation constraints — the contract declares the
 * CONSTRAINT (required / minLength / maxLength / pattern); the runtime form
 * (RHF) enforces it and produces the message. No messages / cross-field /
 * errors live in the contract.
 */
describe('schema — field validation constraints', () => {
  const s = ATOM_PROP_SCHEMAS.field;
  const base = { name: 'email' };

  test('accepts minLength / maxLength / pattern', () => {
    expect(
      s.safeParse({ ...base, minLength: 8, maxLength: 64, pattern: '^[A-Z]{2}\\d{4}$' })
        .success,
    ).toBe(true);
  });

  test('accepts required + type alongside the constraints', () => {
    expect(
      s.safeParse({ ...base, type: 'email', required: true, maxLength: 254 }).success,
    ).toBe(true);
  });

  test('rejects a non-positive / non-integer length', () => {
    expect(s.safeParse({ ...base, minLength: 0 }).success).toBe(false);
    expect(s.safeParse({ ...base, maxLength: 2.5 }).success).toBe(false);
    expect(s.safeParse({ ...base, minLength: -1 }).success).toBe(false);
  });

  test('pattern must be a string', () => {
    expect(s.safeParse({ ...base, pattern: 42 }).success).toBe(false);
  });

  test('rejects an error message on the field (errors are runtime, not contract)', () => {
    // `.strict()` — the contract carries no per-constraint message.
    expect(s.safeParse({ ...base, pattern: '\\d+', errorMessage: 'bad' }).success).toBe(false);
  });
});
