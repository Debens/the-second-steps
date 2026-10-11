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
| Auth library                               | **Not installed**; login is visual only                              |
| ESLint, Prettier, Vitest, Playwright       | Installed (ADR-013); `npm run check`, `npm run test:e2e`             |
| Job queue                                  | **Not installed**                                                    |

## Security posture today

- Login does not authenticate anyone. Do not put real personal or financial data in the database.
- The app talks to Postgres from the server as `zayto_app` over verified TLS. The browser Data API is off. Row Level Security is planned (ADR-006) but not on yet, because there are no tables.
- Secrets stay in `.env.local` (gitignored). The public certificate is `certs/supabase-ca.crt`.
- "Enforce SSL" in Supabase is **not yet confirmed**. Free-tier backups are not enough for real data (ADR-016).

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
│  Core: organisation, identity, people,       │
│  property, documents, audit, jobs            │
├─────────────────────────────────────────────┤
│  Data access (Prisma) → PostgreSQL           │
└─────────────────────────────────────────────┘
```

Dependencies flow **down**. Core must not import lettings or sales.

## Target folder shape (proposed)

Partly created. Expand as feature work starts:

- `core/db/` — Prisma client and connection (exists). Later: organisation, membership, auth adapters, audit, files, jobs
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

Structured server logs with `organisationId`, `actorUserId`, `requestId`. Error reporting (e.g. Sentry) later. No PII in client `console.log`.
