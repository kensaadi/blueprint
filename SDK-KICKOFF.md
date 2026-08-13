# Blueprint SDK (backend) — Kickoff Brief

> ⚠️ NOT the current priority. The backend to build **NOW** is the **Control Plane**
> (marketplace + subscription + license key, Go/DigitalOcean) → see `CONTROL-PLANE-KICKOFF.md`.
> This SDK (`composeEnvelope`) is a separate, later, product-internal piece.
>
> Prepared 2026-07-27 to start the backend SDK in a **dedicated clean chat**.
> Read this + the memory file `project_blueprint_lifecycle` (Engine B / the 3 pieces) first.

## Mission
A **server-side library** that takes a **Blueprint contract + your data (+ state)** and emits a
**portable, serializable Envelope** which the frontend `blueprint` lib hydrates and renders.
Typed, **zero-eval**, runs where your data already lives. It is the missing linchpin between the
Builder (authors contracts) and the FE lib (renders them).

## Where it lives (verified 2026-07-27)
- Monorepo: `~/projects/web/blueprint` (pnpm + turbo).
- **`sdks/` and `services/` dirs EXIST but are EMPTY** → the SDK's scaffolded home. First real code goes in `sdks/`.
- Sibling packages to REUSE (don't duplicate): `packages/blueprint-core` (types, atom zod schemas,
  validator, visibility/RBAC evaluators), `packages/blueprint` (FE runtime = `DashBlueprint`),
  `packages/blueprint-runtime`, `blueprint-tw`, `blueprint-mui`. `apps/builder` authors contracts.

## The anchor — what the FE consumes (this defines the Envelope)
FE entry = `DashBlueprint(props: DashBlueprintProps)` — `packages/blueprint/src/DashBlueprint.tsx:56`.
`DashBlueprintProps` is a MIX of two kinds of fields:

- **Serializable → BELONGS IN THE ENVELOPE:** `version: '1.0'`, `lib?`, `root: BlueprintNode` (the
  contract tree), `metadata?`, `forms?` (`Record<string,FormConfig>`), `rules?` (`NamedRuleMap`),
  the **data slots** (`[slot: string]: unknown` — data keyed by node id), i18n keys, `validationMode?`.
- **Non-serializable → STAYS CLIENT-SIDE, re-attached at render:** `customNodes` (React components),
  `icons` (render functions), `intl.t` (a function), `onValidationDiagnostics` (callback).

➡️ **The Envelope = the serializable subset.** The client re-attaches the runtime bits
(customNodes, icon render fns, intl.t). **This boundary IS the core design decision.**

## Core signature (proposal to confirm in session 1)
```ts
// pure composer — NO I/O; the app fetches contract + data and passes them in
composeEnvelope(input: {
  contract: BlueprintNode;         // the tree (app fetched it from CDN/storage)
  data: Record<string, unknown>;   // values keyed by node id / field
  state?: /* state-axes: env/role/locale/... */;
  rules?: NamedRuleMap;
  forms?: Record<string, FormConfig>;
  i18n?: { keys?: Record<string, string> };
  validationMode?: 'strict' | 'lenient';
}): Envelope;                      // pure JSON, no functions

// FE side helper (decide if it lives in packages/blueprint)
fromEnvelope(envelope: Envelope, runtime: {
  customNodes?; icons?; intl?;     // the non-serializable bits
}): DashBlueprintProps;
```

## Constraints already locked (carry them)
- **Decision #19:** the SDK does NOT interpret behavior/logic. It **composes structure + data → envelope**.
  Behavior stays in typed code (FE React / BE handlers). **Pure composer, minimal/zero I/O** — the APP
  fetches contract + data; the SDK receives and composes. (Mirrors the semantic layer's emit-only `project()`.)
- **Zero eval, fully typed.**
- **Reuse `blueprint-core`:** re-run the existing **validator** (defense) before emitting; the SDK MAY
  pre-resolve visibility/RBAC that depend only on **server-known** state (env/role) — but must LEAVE
  client-state-dependent rules to the FE (do NOT resolve what needs live client state → would break interactivity).
- **Open-core:** SDK is open (npm), like the lib. Self-hosted.

## Open decisions to lock in session 1
1. **Language/runtime:** TS/Node first (shares types with `blueprint-core` = one source of truth).
   Go edition later? (kits already ship Go/Node — a Go SDK is a real future ask, but **TS-first**.)
2. **Envelope schema:** formalize an `Envelope` type **in `blueprint-core`** (serializable subset of
   `DashBlueprintProps` + the state-axes type) so FE + SDK share ONE definition.
3. **Pure-composer scope:** confirm SDK takes contract+data as input, no I/O. (Recommend yes.)
4. **Server-vs-client rule resolution:** draw the line — which visibility/RBAC/access the SDK
   pre-resolves (server-known) vs leaves to the FE (client-state-dependent).
5. **Package name/location:** `sdks/blueprint-sdk-node`? npm name `@dashforge/blueprint-sdk`?
6. **Reference backend app:** the SDK is the library; a **thin reference BE** (Express first, Go later)
   that fetches a contract + data and returns the envelope over HTTP — this is the BE half of the
   "reference repo" for the compliance-expert review + demo + YouTube videos (see GTM in memory).
   Build **SDK-first**, then the reference app.

## Session-1 agenda
1. **Read** `packages/blueprint-core` (types: `BlueprintNode`, `NamedRuleMap`, `FormConfig`, the
   state-axes type; the validator; visibility/RBAC evaluators) + the full `DashBlueprint.tsx`.
2. **Formalize** the `Envelope` type in `blueprint-core`.
3. **Scaffold** the SDK package in `sdks/` (TS) with `composeEnvelope()` + `Envelope`.
4. **Add** `fromEnvelope()` hydration helper on the FE side.
5. **E2E smoke:** an existing demo contract + mock data → `composeEnvelope` → JSON → `fromEnvelope`
   → `DashBlueprint` renders identically. (Round-trip proof.)
6. **Then:** a thin Express reference endpoint returning the envelope.

## Guardrails
- Open-core; zero eval; typed; Decision #19 (no behavior interpretation).
- **Day-job wall:** build on your own machine only; no client code/knowledge (see `feedback_day_job_conflict_wall`).
