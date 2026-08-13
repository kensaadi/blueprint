# Licensing

Copyright (C) 2026 Kenjy Saadi. All rights reserved.

Blueprint is **dual-licensed**. You may use it for free under an open-source
copyleft license, **or** obtain a commercial license that removes the copyleft
obligations. Pick the one that fits how you ship.

## What's under which license

| Package | License |
|---|---|
| `@dashforge/blueprint-core` | AGPL-3.0-only |
| `@dashforge/blueprint-runtime` | AGPL-3.0-only |
| `@dashforge/blueprint-tw` / `-mui` (flavor packs) | AGPL-3.0-only |
| `@dashforge/forms` | MIT |
| `@dashforge/rbac` | MIT |
| `@dashforge/ui-core` | MIT |

The **runtime you link into your app** (core + runtime + a flavor pack) is
AGPL-3.0. The utility/bridge libraries are permissive MIT. Full AGPL text is in
[`LICENSE`](./LICENSE).

## Option 1 — AGPL-3.0 (free, open source)

Good if your project is itself open source, or you are evaluating. In plain
terms, the AGPL adds one obligation beyond the GPL: **if you modify Blueprint
and make it available to users over a network, you must offer those users the
corresponding source of your modified version.** Linking Blueprint into your
own application can bring your application within the copyleft's scope.

If that works for you, you're done — no paperwork, no fee.

## Option 2 — Commercial license (no copyleft)

Most companies embedding Blueprint into a proprietary product **do not want**
AGPL obligations reaching their own code. For them, Blueprint's runtime is also
available under a **commercial license** — sold together with the Builder —
that grants use in closed-source products without the AGPL's network-copyleft
requirements.

> **Don't want AGPL obligations in your app? You don't have to accept them.**
> A commercial license is available. Contact **Kenjy Saadi —
> ken.saadi@yahoo.com** to get terms.

## Notes

- This page is **informational**, not the commercial contract itself. Actual
  commercial terms are provided (and should be reviewed by your legal team)
  before signing.
- The contact above is a placeholder for now; it will move to a dedicated
  licensing address.
- SPDX identifiers in each `package.json` are authoritative for tooling.
