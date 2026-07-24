<div align="center">

<!-- Logo placeholder — drop an SVG/PNG here when the brand is ready:
<img src="./.github/assets/logo.svg" alt="Blueprint" width="120" />
-->

# Blueprint

### The declarative UI contract for React

**One JSON. Any backend. Tailwind or MUI. Your components anywhere.**

Describe an interface once as a portable contract — Blueprint interprets it into
React and lets you bridge in your own components at any node. No DSL to learn,
no framework to marry, no lock-in.

<br />

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-2b6cb0.svg)](./LICENSE)
[![Status: pre-release](https://img.shields.io/badge/status-pre--release-f59e0b.svg)](#-status)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-16a34a.svg)](#-contributing)

**[Docs](#) · [Playground](#) · [Why Blueprint](#-why-blueprint) · [Quick start](#-quick-start) · [The Builder](#-the-builder)**

</div>

---

> **🚧 Status**
> Blueprint is **pre-release** — the runtime is feature-complete in the sandbox and
> this monorepo is being assembled from it. APIs shown below are stable in intent;
> package publishing and the public launch are tracked in the roadmap. Star the repo
> to follow along.

---

## 💡 Why Blueprint

Every team that builds server-driven or config-driven UIs eventually reinvents the
same layer: a JSON description of the interface, a renderer, validation, visibility
rules, RBAC, i18n. Most attempts collapse under their own weight — they try to encode
*behavior* and *backend orchestration* into JSON, and end up reinventing JavaScript
inside a config file.

**Blueprint refuses that trap.** It owns exactly one thing — the **UI contract** — and
nothing else. Behavior lives in your React code. Orchestration lives in your backend.
The contract stays thin, portable, serializable, and testable.

That discipline is the whole product:

- **Portable** — the same contract renders under Tailwind *or* Material UI by flipping one prop.
- **Extensible** — any node can be replaced by your own React component. The catalog covers the common 80%; you bridge the domain-specific 20%.
- **Safe** — every contract is validated against a typed catalog. Invalid UIs fail loud, never silently.
- **Backend-agnostic** — Blueprint describes the UI; your server owns the envelope, the flow, and the data. It fits *your* architecture instead of dictating one.

---

## ⚡ Show me

One contract. Two design systems. Swap a single prop.

```tsx
import { DashBlueprint } from '@dashforge/blueprint';

const contract = {
  version: '1.0',
  root: {
    type: 'form',
    props: {},
    children: [
      { type: 'heading', props: { level: 2, children: 'Sign in' } },
      { type: 'field',   props: { name: 'email', label: 'Email', type: 'email', required: true } },
      { type: 'field',   props: { name: 'password', label: 'Password', type: 'password', required: true } },
      { type: 'submit',  props: { label: 'Continue' } },
    ],
  },
};

// Tailwind flavor
<DashBlueprint {...contract} lib="tw"  forms={{ /* onSubmit, schema */ }} />

// Material UI flavor — identical contract
<DashBlueprint {...contract} lib="mui" forms={{ /* onSubmit, schema */ }} />
```

Need something the catalog doesn't cover? **Bridge any React component at any node:**

```tsx
<DashBlueprint
  {...contract}
  lib="tw"
  customNodes={{ signaturePad: MySignaturePad }}   // your component, dropped in by node type
  slots={{ 'legal-disclaimer': <ComplianceBlock /> }} // or by node id
/>
```

The contract never changed. Your domain logic stayed in React.

---

## 📦 What's inside

| | |
|---|---|
| **36-atom catalog** | Forms, layout, display, navigation — a deliberately *closed* set. Everything else is a custom node. |
| **Two flavors** | First-class Tailwind (`@dashforge/tw`) and Material UI bindings from one contract. |
| **Declarative state** | Per-node `visibility` (static or rule-based), `disabled`, and `access` (RBAC) — composed with a single most-restrictive-wins rule. |
| **i18n built in** | Opt-in `$t` translation references; the contract stays language- and direction-agnostic. |
| **Validation** | Every contract checked against typed zod schemas. Strict in prod, lenient in dev. |
| **Escape hatches** | `forms`, `slots`, `customNodes` — inject behavior and custom components without forking anything. |
| **Visual Builder** | A drag-and-drop editor that authors contracts and guarantees export-time validity. |
| **Backend SDKs** | Populate a contract server-side (Node · Java) and hand it to your frontend. |

---

## 🚀 Quick start

```bash
# Install the runtime + a flavor
npm install @dashforge/blueprint @dashforge/blueprint-tw

# Or clone and run the whole monorepo
git clone https://github.com/kensaadi/blueprint.git
cd blueprint
pnpm install
pnpm dev          # launches the Builder
```

```tsx
import { DashBlueprint } from '@dashforge/blueprint';
import contract from './my-contract.json';

export function Page() {
  return <DashBlueprint {...contract} lib="tw" />;
}
```

---

## 🧭 How it works

Blueprint is an **interpreter + bridge**, not a framework.

```
   Contract (JSON)                 Runtime                    Your app
 ┌────────────────┐        ┌──────────────────────┐      ┌────────────────┐
 │ atoms · props  │        │  validate → compile  │      │ forms  (events)│
 │ visibility     │ ─────► │  dispatch by `lib`   │ ───► │ slots  (by id) │
 │ access · i18n  │        │  render React tree   │      │ customNodes    │
 └────────────────┘        └──────────────────────┘      └────────────────┘
    describes WHAT              interprets                you decide HOW
```

- The **catalog is closed** on purpose. A component qualifies as an atom only if its props serialize to JSON, it needs no function props, and it owns no state you must observe. Everything else — dialogs, tables, domain widgets — is a **custom node**, which is plain React.
- The contract describes **structure**. Behavior (submit, click, fetch), presentation of domain widgets, and backend orchestration all live in your code. This is the boundary that keeps Blueprint thin and adoptable.

---

## 🗂 Monorepo

```
packages/            npm libraries — @dashforge/*
  blueprint-core     zod schemas · validator · types (no React)
  blueprint          <DashBlueprint> compiler + flavor dispatch
  blueprint-tw       36 bindings on @dashforge/tw
  blueprint-mui      36 bindings on @mui/material
  blueprint-ai       AI knowledge base + prompt strategies
apps/
  builder            the visual Builder (OSS + license-gated tiers)
services/
  workspace-service  Go — shared workspaces, locks, roles, audit
sdks/
  node · java        backend SDKs — populate contracts server-side
docker/              Dockerfiles + compose reference
```

Toolchain: **pnpm workspaces + Turborepo**, TypeScript (strict), Vitest, and Go/Maven
orchestrated as polyglot turbo tasks.

---

## 🎛 The Builder

A drag-and-drop visual editor that authors Blueprint contracts. Its defining property
isn't "nicer editing" — it's that **you cannot export an invalid contract**. Validity
becomes a guarantee, not a hope.

- Free, open-source **Community** edition — clone and run it locally.
- Paid tiers add operational value: remote storage, shared team workspaces, collaboration
  locks, roles, deploy pipelines, audit, SSO. Gated by license inside the same codebase.

---

## 🤝 Contributing

Blueprint is early and moving fast. Issues, discussions, and PRs are welcome. Please read
`CONTRIBUTING.md` (coming soon) and note that contributions require signing the CLA.

---

## 📄 License

**AGPL-3.0-only.** The runtime libraries and the Builder Community edition are free and
open source. Paid Builder features are gated by license within the same repository — see
[the design docs](#) for the commercial model.

<div align="center">
<br />
<sub>Built with a bright line between the UI and everything around it.</sub>
</div>
