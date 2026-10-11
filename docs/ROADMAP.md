# Roadmap

Dates are not committed. Phases are **sequences**, not promises.

## Phase 0 — Foundations (current)

Done in this phase:

1. Checkpoint of the visual login, rules and `docs/`
2. Next.js 16 and React 19.3 (ADR-011)
3. App Router migration (ADR-012)
4. ESLint, Prettier, Vitest, Playwright (ADR-013)
5. `.env.example` without secrets
6. Decisions: Supabase Auth, UK-only data, required MFA, invite-only agencies, Supabase London (ADR-019, 015, 016)
7. Brand tokens and Inter (ADR-017)
8. Light / dark / system themes and responsive conventions (ADR-018)
9. Prisma 7 connected as `zayto_app`; Data API off; TLS certificate in the repo (ADR-004, 016)

Still outstanding in this phase:

1. Confirm **Enforce SSL** is on in the Supabase dashboard (owner could not find the toggle)
2. Confirm the Phase 1 scope below

## Phase 1 — Proof of concept slice (proposed)

A staff user can, in **one organisation**:

1. Sign in for real (Supabase Auth + MFA — owner approved; development email delivery remains unresolved)
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
- Building all screens before auth and a first table
