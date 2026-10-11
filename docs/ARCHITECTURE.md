# Architecture

## What we have today (confirmed, inspected)

| Piece | Status |
| --- | --- |
| Next.js 15.4.1 + React 19.1.0 | Installed; **Pages Router** (`pages/login.tsx`, `pages/_app.tsx`) |
| TypeScript, `strict: true`, `@/` imports | Installed |
| Tailwind CSS 4 + `styles/globals.css` | Installed |
| shadcn/ui (Nova, Base UI), `components/ui` | Installed; `rsc: false` |
| PostgreSQL / Prisma | **Not installed** |
| Auth library | **Not installed**; login is visual only |
| Tests / ESLint project config | **Not installed** (`npm run lint` is a stub relative to missing ESLint) |
| Job queue | **Not installed** |

Uncommitted work includes shadcn setup and the restyled login page. Do not discard it.

## Style: modular monolith (confirmed)

One application, one primary database (when added). Code is split into **modules** so lettings, future sales, and shared core do not become a tangle.

We are **not** starting with microservices. That would add operational cost before we have product-market fit.

```
┌─────────────────────────────────────────────┐
│                 Presentation                 │  pages / later app router
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

Not created yet. When we start feature work (after the user asks):

- `core/` — organisation, membership, auth adapters, audit, files, jobs
- `modules/lettings/` — applications, tenancies, rent, maintenance, compliance
- `modules/sales/` — empty until needed
- `components/ui/` — shadcn (exists)
- `pages/` — current routes (exists)
- `app/` — **only after** an explicit App Router migration

Exact paths may sit under `src/` later. **Unresolved** whether to introduce `src/`.

## Next.js routing (confirmed + target)

- **Confirmed:** upgrade Next.js (15.5.27, then 16), then migrate to the App Router **before** building CRM screens (ADR-011, ADR-012).
- **Why:** the App Router is the current Next.js default for Server Components, layouts, and Server Actions, and the app is small enough to move now in one step.
- Until migration, Server Actions and `app/` conventions in the rules are **forward-looking**.

## Hosting and jobs (unresolved)

Where we deploy (Vercel, a UK VM, container) is unset. That affects file storage, cron, and how we run workers.

**Proposed** for jobs: persist a `Job` row and process it with a later worker (for example [Inngest](https://www.inngest.com/) or a Postgres-backed worker). For the first PoC slice, short internal writes may stay in-request **with timeouts**; anything that calls a third party should still be a job.

## Caching (proposed)

CRM data is private. Default to **no public static cache**. Revalidate after mutations. Do not put tenant PII in a CDN-cached HTML page.

## Observability (proposed)

Structured server logs with `organisationId`, `actorUserId`, `requestId`. Error reporting (e.g. Sentry) later. No PII in client `console.log`.
