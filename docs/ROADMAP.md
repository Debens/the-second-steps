# Roadmap

Dates are not committed. Phases are **sequences**, not promises.

## Phase 0 — Foundations (current)

- Inspected Next.js + shadcn login (visual only)
- Development rules and `docs/` (this work)
- **Next:** keep uncommitted UI work; do not rewrite it for its own sake

Still outstanding in this phase, in order:

1. ~~Commit a checkpoint of current work~~ (done locally; push awaits owner approval)
2. ~~Upgrade Next.js to 15.5.27, then 16 (ADR-011)~~ (done)
3. ~~Migrate to the App Router (ADR-012)~~ (done)
4. ~~Add ESLint, Prettier, Vitest, Playwright, and scripts (ADR-013)~~ (done)
5. Add `.env.example` without secrets
6. Decide auth provider, database host and data location (ADR-007)
7. Confirm the Phase 1 scope below

## Phase 1 — Proof of concept slice (proposed)

A staff user can, in **one organisation**:

1. Sign in for real
2. Create/view **properties** and **landlords**
3. Create a **lettings listing** (not live portals)
4. Record an **enquiry** and a **viewing**
5. See loading, empty, and error UI

Out of PoC slice: payments, AML, portals, e-sign, landlord portal.

## Phase 2 — Applications and tenancy shell (proposed)

Applicant household, tenancy record with parties and dates, document upload to **private** storage. Check orders as **placeholders**.

## Phase 3 — Operations (proposed)

Compliance dates, work orders, inspections. Rent ledger **thin** (demands/receipts), not a full accounts suite.

## Phase 4 — Integrations (proposed)

First real adapter (likely documents or e-sign **or** one portal — **unresolved**). Mocks remain for local dev. Webhooks, idempotency, jobs.

## Phase 5 — Regulated checks (blocked on specs)

Referencing, AML/KYC, Right to Rent, insurance, deposit protection — only after written rules.

## Phase 6 — Sales (later)

Sales instruction and pipeline on shared property/people. Separate module.

## Phase 7 — Portals and scale (later)

Landlord/tenant logins, richer finance, RLS, dedicated workers, UK hosting review.

## Explicitly not scheduled

- Rewriting the stack for fashion
- Microservices
- Building all screens before auth and a database
