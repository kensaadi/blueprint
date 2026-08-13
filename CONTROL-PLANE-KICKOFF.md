# Control Plane (our web-service) — Kickoff Brief

> Prepared 2026-07-27. This is the backend to build **NOW** — NOT the Blueprint SDK
> (`composeEnvelope`, see `SDK-KICKOFF.md`, that's a separate/later piece).
> **Source of truth: read `~/projects/web/learn/blueprint/BUILDER-V2-DESIGN-v2.md` §7 (License) + §8
> (Marketplace) FIRST** — this brief is the condensed, corrected scope.

## Mission
The **only always-on backend we run** — deployed on **DigitalOcean**, written in **Go**. It handles
the three commercial concerns:
1. **Marketplace** (template sales)
2. **Subscription** (Builder tiers)
3. **License key** (Ed25519 issuance)

Everything else (the Builder, the Workspace Service) is **customer-self-hosted** and OUT of scope here.

## Stack (locked — Decision #35)
- **Go 1.25 + Gin + pgx/v5 + Postgres + golang-migrate.**
- **Reuse the `checkout-kit` Go skeleton** (same deploy pattern; the user already built checkout-kit in Go)
  + `dashforge-rbac-go` (Decision #36) where auth is needed.
- Ed25519 via Go stdlib `crypto/ed25519`.
- Deploy: DigitalOcean. Likely home: the monorepo **`services/`** dir (currently empty) — confirm.
- Sized small: the License Issuer core is ~500–800 LOC Go.

## Subsystem 1 — License Issuer (§7)
- **Stripe webhooks** (`subscription.created / updated / deleted`) → sign an **Ed25519 token** → store in Postgres.
- **Token shape** (EdDSA-signed JWT — §7.2):
  ```json
  { "sub":"customer@company.com", "tier":"team",
    "features":["s3-sync","collab-lock","roles","deploy-pipeline"],
    "seats":3, "activeUntil":"2027-07-08", "fallbackVersion":"1.6.0", "licenseId":"lic_ABC123" }
  ```
- **Verification is OFFLINE** (JetBrains model, §7.3): public key pinned in the Builder binary; access iff
  `BUILD_RELEASE_DATE ≤ activeUntil`, else downgrade to Community (never bricks). **The Issuer only ISSUES —
  no phone-home.** Revocation: Pro soft (bg check if online); Enterprise self-manages via on-prem server.
- Postgres: `subscriptions`, `licenses`, `webhook_events` (idempotency **unique index** on Stripe event id).

## Subsystem 2 — Subscription (§7.4 + tiers)
- Tiers: **Community** (free, no token) · **Pro / Team (€99/seat/mo, min 3) / Business (€399/mo flat, ≤10 seat)**
  = self-serve **Stripe checkout** (vendor-hosted) → Issuer emits token → user pastes in Builder · **Enterprise**
  = no Stripe, **contact form** → sales → license (maybe on-prem license server).
- The Builder never touches Stripe/card data. Link to the **Stripe customer portal** for self-management.
- **Account required** for subscription (identity model).

## Subsystem 3 — Marketplace (§8)
- **First-party only** (Ken authors), in-Builder Store, **one-shot buy**, **snapshot-on-buy** (buyer owns the JSON
  forever, offline-safe). **No refunds.** All tiers can buy. Free = `Free` badge; paid = price (€15–30).
- **Delivery**: the License Issuer holds **template entitlements** (Stripe one-shot products). A **catalog endpoint**
  lists templates + prices + ownership; Stripe checkout inline; minor bugfix → opt-in auto-push to owners; major
  version → new SKU + loyalty discount.
- **Decoupled from subscription tiers** — no tier bundles templates.
- **Identity: no-account + signed receipts** (buyer stays anonymous; a signed receipt proves ownership) — contrast
  with subscription (account). Initial catalog: Customer Details, Address Form, Wizard Multi-Step, Data Grid, Booking Form.

## Postgres schema (starting point — refine in session 1)
`subscriptions` · `licenses` · `webhook_events` (idempotency) · `templates` (catalog) ·
`template_entitlements` / `receipts` (marketplace ownership, signed) · optional `accounts` (subscription only).

## Likely HTTP surface (Gin)
- `POST /webhooks/stripe` (subscriptions + one-shot; idempotent)
- `GET  /marketplace/catalog` (templates + prices + ownership)
- `POST /marketplace/checkout-session` · delivery/receipt issue
- `POST /receipts/verify` (validate a signed marketplace receipt)
- `POST /licenses/issue` (internal, driven by webhook) · `GET /licenses/:id` (status)
- `GET  /healthz`

## Open decisions for session 1 (lock first)
1. **Repo/home:** monorepo `services/control-plane` (single service) vs split (`license-issuer` + `marketplace`)?
   Recommend **one service** to start (small), split later.
2. **Keypair management:** where the Ed25519 **private** key lives (env/secret on DO) + public-key pinning into
   the Builder build. Rotation story.
3. **Marketplace receipt format** (the "signed receipt" = Ed25519 over {templateId, buyerRef, ts}?) + how the
   Builder verifies it offline.
4. **Stripe products mapping:** subscription price ids ↔ tiers/features; one-shot product ids ↔ templates.
5. **Account model:** minimal (email + Stripe customer id) — do we need our own auth or lean on Stripe/email-link?
6. **Reuse boundary:** exactly what to lift from the `checkout-kit` Go skeleton (server bootstrap, pgx, migrations,
   Stripe webhook handler, `pkg/rbac`).

## Session-1 agenda
1. **Read** `BUILDER-V2-DESIGN-v2.md` §7–§8 (+ §5 architecture diagram) end-to-end.
2. Lock the 6 open decisions above.
3. Scaffold `services/control-plane` (Go + Gin + pgx + golang-migrate), lifting the checkout-kit skeleton.
4. Migrations for the schema above; wire the **Stripe webhook** handler (idempotent).
5. Implement **Ed25519 token signing** (`crypto/ed25519`) + the token shape; a `/licenses/issue` path driven by webhook.
6. Marketplace catalog endpoint + one-shot checkout + **signed receipt** issue/verify.
7. Smoke: fake Stripe event → token issued & stored; buy a template → signed receipt → verify offline.

## Guardrails
- This is the **ONLY always-on service** — keep it lean; no SLA-heavy scope creep.
- **Offline license verification, no mandatory phone-home** (Decision #32).
- Open-core: the Blueprint runtime packages stay pure OSS with **zero license machinery** (Decision #29);
  gating touches ONLY the Builder app.
- **Day-job wall:** build on your own machine only (see `feedback_day_job_conflict_wall`).
