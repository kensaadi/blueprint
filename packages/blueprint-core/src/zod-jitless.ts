/**
 * zod, pre-configured jitless — Blueprint's no-eval guarantee.
 *
 * zod v4 JIT-compiles object validators with `new Function` and probes
 * eval-availability with `new Function("")` UNLESS `jitless: true` is set.
 * Crucially, zod captures that flag when a schema is CONSTRUCTED, not when it
 * is parsed — so the config must run before the first `z.object(...)`.
 *
 * Importing `z` from THIS module (instead of directly from 'zod') guarantees
 * ordering: loading this module runs `z.config({ jitless: true })`, and only
 * then does the re-exported `z` reach the caller. Every core module that
 * builds a schema imports `z` from here. Result: the runtime never
 * JIT-compiles or touches eval/Function, and stays clean under a strict CSP
 * (no `unsafe-eval`). Enforced by `no-eval.test.ts`.
 */
import { z } from 'zod';

z.config({ jitless: true });

export * from 'zod';
