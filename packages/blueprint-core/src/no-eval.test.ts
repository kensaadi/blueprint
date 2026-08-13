/**
 * The no-eval receipt.
 *
 * Blueprint's runtime validates a contract with zod, and zod v4 will
 * JIT-compile validators with `new Function` (and probe eval-availability
 * with `new Function("")`) UNLESS `jitless: true` is configured — which
 * `schema.ts` does. This test proves the guarantee holds end-to-end: while a
 * real document is validated, `new Function` and `eval` are swapped for
 * throwing stubs and asserted to be NEVER invoked.
 *
 * If someone regresses the config, adds an eval-using path, or bumps zod to a
 * version that ignores `jitless`, this test fails loudly.
 */
import { describe, it, expect } from 'vitest';
import { validate } from './validator';
import type { BlueprintDocument } from './types';

// A representative contract: a nested form with fields, so the validator
// exercises the recursive node schema and per-atom prop schemas — the object
// parses where zod would JIT-compile with `new Function`.
const doc: BlueprintDocument = {
  version: '1.0',
  lib: 'tw',
  root: {
    type: 'form',
    id: 'signup',
    props: {},
    children: [
      { type: 'field', props: { name: 'email', label: 'Email' } },
      { type: 'field', props: { name: 'vat', label: 'VAT' } },
    ],
  },
} as unknown as BlueprintDocument;

describe('no-eval guarantee', () => {
  it('validates a contract without ever invoking new Function or eval', () => {
    const origFunction = globalThis.Function;
    const origEval = globalThis.eval;
    let touched = '';

    // Swap the dynamic-code primitives for tripwires.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.Function = function (..._args: unknown[]): never {
      touched = 'new Function';
      throw new Error('new Function was called');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.eval = function (): never {
      touched = 'eval';
      throw new Error('eval was called');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    try {
      const result = validate(doc);
      // Sanity: it actually ran the validator (and the doc is valid).
      expect(result.ok).toBe(true);
    } finally {
      globalThis.Function = origFunction;
      globalThis.eval = origEval;
    }

    expect(touched).toBe('');
  });
});
