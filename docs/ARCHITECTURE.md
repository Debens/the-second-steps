# Architecture

## What we have today (confirmed, inspected)

| Piece                                      | Status                                                               |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Next.js 16.4 + React 19.3                  | Installed; **App Router** (`app/layout.tsx`, `app/login/`)           |
| TypeScript, `strict: true`, `@/` imports   | Installed; `npm run typecheck`                                       |
| Tailwind CSS 4 + `styles/globals.css`      | Installed; Inter; brand tokens (ADR-017)                             |
| Light / dark / system themes               | Installed (`components/theme/`, ADR-018)                             |
| shadcn/ui (Nova, Base UI), `components/ui` | Installed; `rsc: true`                                               |
| PostgreSQL (Supabase London) / Prisma 7.10 | Installed and connected as `zayto_app`; no tables yet (ADR-004, 016) |
| Auth                                       | Supabase Auth installed; local Mailpit magic-link sandbox            |
| ESLint, Prettier, Vitest, Playwright       | Installed (ADR-013); `npm run check`, `npm run test:e2e`             |
| Job queue                                  | **Not installed**                                                    |

## Security posture today

- Supabase Auth proves identity and maintains server-verified sessions. The current dashboard is a sandbox only: workspaces, memberships, participations, entitlements, role authorisation, required MFA, rate limiting, and production email delivery are not implemented. Do not put real personal or financial data in the database.
- The app talks to Postgres from the server as `zayto_app` over verified TLS. The browser Data API is off. Row Level Security is planned (ADR-006) but not on yet, because there are no tables.
- Secrets stay in `.env.local` (gitignored). The public certificate is `certs/supabase-ca.crt`.
- "Enforce SSL" is confirmed on. Free-tier backups are not enough for real data (ADR-016).

## Tenant and account model (confirmed design; not implemented)

`Workspace` is the hard boundary for customer data, subscriptions, entitlements, usage, and business permissions (ADR-020). An agency, an independent landlord, and Zayto's internal operation use different workspace types. An `Organisation` represents a legal or commercial body and may own a workspace; an individual landlord may own a workspace without being modelled as a company.

One Supabase identity may have several kinds of access:

- `Membership` — operates a business workspace as an owner, administrator, or staff member.
- `Participation` — acts in a particular application, tenancy, guarantee, referencing case, or explicitly shared landlord relationship.
- `ResourceGrant` — limits a participant to named resources, actions, and fields.

Applicants, tenants, guarantors, and invited landlords are first-class users with a personal portal, but they are not broad members of an agency workspace. A small user-controlled personal profile may be reused with explicit confirmation; each workspace retains its own operational person records and history. Sensitive submissions remain case-scoped and private by default.

Every protected operation checks, on the server:

1. Workspace entitlement or allowance.
2. User permission in the current membership or participation.
3. Access to the specific resource and fields.

Application queries always scope by `workspaceId`. PostgreSQL RLS is added with the first workspace-owned records as defence in depth (ADR-023).

## Style: modular monolith (confirmed)

One application, one PostgreSQL database. Code is split into **modules** so lettings, future sales, and shared core do not become a tangle.

We are **not** starting with microservices. That would add operational cost before we have product-market fit.

```
┌─────────────────────────────────────────────┐
│                 Presentation                 │  app/ + shadcn/ui + domain components
│         shadcn/ui + domain components        │
├─────────────────────────────────────────────┤
│     Application (use-cases + authz)          │
├──────────────┬──────────────────────────────┤
│   Lettings   │  Sales (later, no imports    │
│   module     │  from lettings internals)    │
├──────────────┴──────────────────────────────┤
│  Core: workspace, identity, people,          │
│  property, documents, audit, jobs            │
├─────────────────────────────────────────────┤
│  Data access (Prisma) → PostgreSQL           │
└─────────────────────────────────────────────┘
```

Dependencies flow **down**. Core must not import lettings or sales.

## Target folder shape (proposed)

Partly created. Expand as feature work starts:

- `core/db/` — Prisma client and connection (exists). Later: workspace, membership, participation, entitlement, audit, files, jobs
- `modules/lettings/` — applications, tenancies, rent, maintenance, compliance (not created)
- `modules/sales/` — empty until needed
- `components/ui/` — shadcn (exists)
- `components/theme/` — light/dark/system (exists)
- `app/` — routes, layouts, and Server Actions (exists)

Exact paths may sit under `src/` later. **Unresolved** whether to introduce `src/`.

## Next.js routing (confirmed)

App Router is in use (`app/`). Do not add `pages/`. New screens use Server Components by default, with small Client Components for interactivity (see `app/login/`).

## Hosting and jobs (unresolved)

Where we deploy (Vercel, a UK VM, container) is unset. That affects file storage, cron, and how we run workers. Hosting that holds personal data must be in the **UK** (ADR-015).

**Proposed** for jobs: persist a `Job` row and process it with a later worker (for example [Inngest](https://www.inngest.com/) or a Postgres-backed worker). For the first PoC slice, short internal writes may stay in-request **with timeouts**; anything that calls a third party should still be a job.

## Caching (proposed)

CRM data is private. Default to **no public static cache**. Revalidate after mutations. Do not put tenant PII in a CDN-cached HTML page.

## Observability (proposed)

Structured server and audit records must use `workspaceId`, `actorUserId`, `requestId`, and the relevant participation or resource where applicable. Error reporting (e.g. Sentry) is later. Do not put PII, sensitive evidence, tokens, or document contents in logs or the client console.

## Commercial modules (confirmed design; not implemented)

CRM, pre-tenancy, property management, accounting, referencing, AML, Right to Rent, and later modules are independently entitled. They may share narrow core capabilities, but an optional module must not require another optional module's subscription or import its internal data access.

Plans, free allowances, trials, paid add-ons, usage limits, and pay-per-use services are represented through a versioned product catalogue, entitlements, service orders, and append-only usage events. Specific prices and tiers remain unresolved.

Referencing and AML are native Zayto products: Zayto owns the case workflow, consent, audit, customer experience, and provider orchestration. Specialist data and verification services remain external adapters. Detailed legal and decision rules require written specifications.
