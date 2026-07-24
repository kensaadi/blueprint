# Blueprint

> Declarative UI contract runtime + visual Builder — an interpreter and
> bridge for server-driven UI composition. Describe a UI as portable
> JSON; render it with Tailwind or MUI; extend any node with your own
> React components.

**Status:** pre-release. This monorepo is being extracted from the
Blueprint sandbox. Public launch tracked in the `blueprint-builder`
milestone.

## What Blueprint is

A **contract**, not a framework. A Blueprint contract is a JSON tree of
atoms (form fields, layout, display, navigation) with declarative
visibility, access (RBAC), i18n, and validation. The runtime interprets
it into React; three escape hatches (`forms`, `slots`, `customNodes`)
let you inject any React component at any node.

Blueprint owns the **UI contract**. It deliberately does NOT own the
envelope, flow orchestration, events, or backend integration — those
are your domain. See `DESIGN.md` Decision #19.

## Monorepo layout

```
packages/            npm libraries (pnpm workspace)
  blueprint-core     zod schemas + validator + types (no React)
  blueprint          <DashBlueprint> compiler + lib dispatch
  blueprint-tw       36 bindings on @dashforge/tw
  blueprint-mui      36 bindings on @mui/material
  blueprint-ai       AI knowledge base + prompt strategies
apps/
  builder            the visual Builder (OSS Community + license-gated tiers)
services/            backend the customer self-hosts
  workspace-service  Go — shared workspaces, locks, roles, audit (gateway)
sdks/
  node               backend SDK (TypeScript)
  java               backend SDK (Maven)
docker/              Dockerfiles + compose reference
```

## License

Blueprint is **AGPL-3.0-only**. The runtime library and the Builder
Community edition are free and open source. Paid Builder tiers unlock
operational features (remote storage, team collaboration, governance,
support) and are gated by license within the same codebase.

## Toolchain

- pnpm workspaces + Turborepo
- TypeScript, Vite/tsup for library builds, Vitest for tests
- Go (services) + Maven (Java SDK) orchestrated as polyglot turbo tasks

## Development

```bash
pnpm install
pnpm build      # turbo build (topological)
pnpm test
pnpm dev        # run the Builder locally
```
