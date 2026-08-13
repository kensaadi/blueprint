# Blueprint runtime — supply chain & no-eval manifest

The Blueprint runtime is what you link into your app to render a contract. Its
**entire production closure** is small enough to read in an afternoon, and it
executes **no dynamic code** (`eval` / `Function` constructor) — a property we
prove, not just claim.

## Production dependency closure

Resolved from `@dashforge/blueprint-runtime` (production deps, all depths).
`react` is a peer dependency you already provide.

| Package | Version | License | Dynamic code (`eval`/`Function`)? |
|---|---|---|---|
| `@dashforge/blueprint-runtime` | 0.x | AGPL-3.0-only | none |
| `@dashforge/blueprint-core` | 0.x | AGPL-3.0-only | none |
| `@dashforge/forms` | 1.0.0 | MIT | none |
| `@dashforge/rbac` | 1.0.0 | MIT | none |
| `@dashforge/ui-core` | 1.0.0 | MIT | none |
| `zod` | 4.4.3 | MIT | **yes — JIT, disabled (see below)** |
| `react-hook-form` | 7.82.0 | MIT | none |
| `valtio` | 2.3.0 | MIT | none |
| `proxy-compare` | 3.0.1 | MIT | none |
| `tslib` | 2.8.1 | 0BSD | none |
| `react` (peer) | ≥19 | MIT | none |

Exact resolved versions are pinned in `pnpm-lock.yaml`. A CycloneDX SBOM can
be produced on request (`cyclonedx-npm`).

## The one dynamic-code path — and why it can't fire

`zod` v4 can JIT-compile object validators with the `Function` constructor for
speed. **It is the only package in the closure that can.** Blueprint disables
it: `packages/blueprint-core/src/zod-jitless.ts` calls
`z.config({ jitless: true })` **before any schema is constructed** (zod captures
the JIT flag at construction, not at parse). With `jitless` on, zod neither
JIT-compiles nor runs its `Function("")` eval-availability probe — it validates
via the interpreted path.

## Why we prove it at runtime, not with a grep

A source scan is **not** sufficient evidence, and we want to be honest about
that. zod does not write `new Function(...)` literally — it aliases the
constructor:

```js
// zod/v4/core/doc.js
const F = Function;
return new F(...args, body);   // a naive grep for "new Function" misses this
```

So the guarantee is enforced **dynamically**, immune to aliasing or
minification:

- **Runtime tripwire test** — `packages/blueprint-core/src/no-eval.test.ts`
  replaces `globalThis.Function` and `globalThis.eval` with stubs that throw,
  validates a real contract, and asserts neither is ever invoked. It fails
  loudly if the config regresses, a code path adds `eval`, or zod is bumped to
  a version that ignores `jitless`.
- **Strict-CSP demo** — `security/csp-no-eval.html` runs the validator under a
  `Content-Security-Policy` with **no `unsafe-eval`**; the page reports zero
  runtime CSP violations and shows a deliberate `Function` probe being blocked
  by the browser (proof the policy is genuinely enforced).

## Verify in ~10 seconds

```bash
pnpm --filter @dashforge/blueprint-core test -- no-eval
```

Then open `packages/blueprint-runtime/security/csp-no-eval.html` in a browser.

## Scope

This manifest covers the **headless runtime**. A flavor pack
(`@dashforge/blueprint-tw`, `@dashforge/blueprint-mui`) adds your chosen UI
library (tailwind-variants or MUI); audit that layer separately per your
component-library policy.
