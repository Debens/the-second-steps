# Architectural decision log

Newest first. Status: **Accepted** | **Proposed** | **Superseded** | **Unresolved**.

## ADR-014 — Owner communication and ask-first working

- **Status:** Accepted
- **Context:** The project owner is not a developer and wants to keep control of decisions.
- **Decision:** AI assistants follow `.cursor/rules/communication.mdc`: explain plans and commands in plain English, report progress, and ask instead of inventing requirements or making major decisions silently. Routine development (editing, dev dependencies, tests, local commits) proceeds without per-step approval; deleting significant data, destructive database changes, publishing/deploying, security or auth changes, and paid services always need explicit approval.
- **Date:** 2026-10-11

## ADR-013 — Development tooling

- **Status:** Accepted and done (2026-10-11)
- **Decision:** ESLint 9 with `eslint-config-next` and `eslint-config-prettier` (via the ESLint CLI, since Next.js 16 removes `next lint`), Prettier 3, Vitest 5 for unit/integration tests, Playwright for browser tests (Chromium). `npm run check` runs typecheck, lint, format check and unit tests. shadcn output (`components/ui`) is excluded from Prettier so CLI updates diff cleanly. `@types/node` moved to v22 to match the installed Node.js 22.
- **Date:** 2026-10-11

## ADR-012 — Migrate to the App Router before building CRM screens

- **Status:** Accepted and done (2026-10-11). Supersedes ADR-002's "migrate later". Login is now `app/login/page.tsx` (server) rendering `login-form.tsx` (client); `pages/` removed.
- **Context:** The app has only two Pages Router files (`_app.tsx`, `login.tsx`). Every new screen built in `pages/` would need moving later.
- **Decision:** After the Next.js 16 upgrade, move to `app/` (`app/layout.tsx`, `app/login/page.tsx`), set shadcn `rsc: true`, then remove `pages/`. Verify login in the browser at each step.
- **Date:** 2026-10-11

## ADR-011 — Next.js upgrade path

- **Status:** Accepted and done (2026-10-11): now Next.js 16.4.0, React 19.3.0. Next.js advisories cleared. Remaining `npm audit` items are in the shadcn CLI's file-matching dependency (`braces`), development-time only, with no non-breaking fix yet.
- **Context:** Installed Next.js is 15.4.1. `npm audit` reports high and critical advisories. The current release is 16.4.0; 15.5.27 is the 15.x security backport.
- **Decision:** Commit a checkpoint, upgrade to 15.5.27 and verify, then upgrade to 16 with the official codemod (`npx @next/codemod upgrade latest`) and verify. Node 22 meets Next 16's minimum (20.9). Patch before any public hosting.
- **Date:** 2026-10-11

## ADR-010 — Do not invent regulated business rules

- **Status:** Accepted
- **Context:** Referencing, AML, KYC, Right to Rent, insurance, and deposits are legally sensitive.
- **Decision:** Code may store orders, statuses, and documents. Pass/fail and statutory timelines wait for written specs.
- **Date:** 2026-10-11

## ADR-009 — Job processing

- **Status:** Unresolved
- **Options:** In-request (PoC only), Postgres job table + worker, Inngest/Trigger.dev, cloud queues.
- **Lean:** Job row + worker before any paid queue, unless hosting makes a hosted scheduler easier.
- **Date:** 2026-10-11

## ADR-008 — File storage

- **Status:** Unresolved
- **Need:** Private documents (IDs, tenancy PDFs). Not public `/public` files.
- **Lean:** S3-compatible bucket in the UK/EU, short-lived signed URLs.
- **Date:** 2026-10-11

## ADR-015 — Data residency, MFA, and agency onboarding

- **Status:** Accepted (owner decision, 2026-10-11)
- **Decision:** All agency and personal data is stored in the **UK only** (London region) for the database, file storage, and any provider that holds personal data. Staff **must** use two-step login (MFA). Agencies are **invite-only** for the proof of concept: the owner creates each organisation; there is no public sign-up.
- **Unresolved:** whether one login may belong to several agencies (owner unsure). Design so membership is a separate table either way; do not block it in the schema.
- **Date:** 2026-10-11

## ADR-007 — Authentication provider

- **Status:** Accepted (owner decision, 2026-10-11); not installed
- **Decision:** **Better Auth**, storing users and sessions in our own PostgreSQL, using its organisation feature for agencies, memberships, roles and invitations, and its two-factor feature (required per ADR-015). Custom password handling is rejected.
- **Why:** accounts stay in our UK database (simpler UK GDPR position), no per-user fees, and organisations/invitations match invite-only agency onboarding.
- **Note:** Confirm current Better Auth APIs from its official docs at install time. Changing auth requires owner approval.
- **Date:** 2026-10-11

## ADR-006 — Row Level Security

- **Status:** Proposed
- **Context:** Application `organisationId` filters can be missed.
- **Decision lean:** Add PostgreSQL RLS as defence in depth after basic Prisma scoping works. Not required for the first schema spike.
- **Date:** 2026-10-11

## ADR-005 — Multi-tenant isolation

- **Status:** Accepted (design); not implemented
- **Decision:** Shared PostgreSQL, `organisationId` on tenant data, shared-schema. Not a database-per-agency for v1.
- **Why:** Simpler operations for a PoC and early commercial product. Revisit only if a customer contract requires physical isolation.
- **Date:** 2026-10-11

## ADR-004 — PostgreSQL and Prisma

- **Status:** Proposed (not installed)
- **Decision lean:** PostgreSQL as the system of record; Prisma as ORM and migration tool.
- **Why:** Relational data (tenancies, FKs, transactions) fits SQL. Prisma is widely used with Next.js. Confirm versions against current Prisma docs at install time (Prisma 6 vs 7 layout differs).
- **Date:** 2026-10-11

## ADR-003 — Modular monolith, lettings vs sales

- **Status:** Accepted (design)
- **Decision:** One app. Shared core. Lettings module now; sales module later without importing lettings internals.
- **Date:** 2026-10-11

## ADR-002 — App Router as target, Pages Router until migration

- **Status:** Superseded by ADR-012 (timing changed: migrate now, before CRM screens)
- **Context:** The repo uses Pages Router. Next.js currently recommends the App Router for new apps (Server Components, layouts, Server Actions).
- **Decision:** Do not migrate until a dedicated, tested task. New screens stay in `pages/` until then. After migration, new features use `app/`. shadcn `rsc: false` should be revisited at migration.
- **Date:** 2026-10-11

## ADR-001 — shadcn/ui + Tailwind

- **Status:** Accepted
- **Context:** Installed Nova preset, Base UI, Tailwind v4, components Button/Input/Label/Card.
- **Decision:** shadcn/ui is the component library. Add primitives via the shadcn CLI rather than one-off CSS.
- **Date:** 2026-10-11
