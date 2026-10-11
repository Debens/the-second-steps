# Zayto — AI working instructions

Zayto is a commercial UK residential **lettings and property management CRM**. Residential **sales** will be added later. We are in a **proof of concept**, but architecture and security choices must still suit a real product.

## The project owner

The owner is **not a software developer**. Follow `.cursor/rules/communication.mdc` in every session: explain plans and commands in plain English, keep the owner informed, and **ask rather than make things up** when a requirement or decision is unclear.

## Before you write code

1. Read this file and the relevant files in `.cursor/rules/` and `docs/`.
2. Inspect existing code and follow it unless a documented decision says otherwise.
3. State whether the work is a **confirmed** path, a **proposal**, or **unresolved**.
4. Work in small steps. Do not generate large amounts of code at once.
5. Do not invent business rules for referencing, insurance, AML, KYC, Right to Rent, or deposits. Those will be specified separately.

## Current stack (installed)

- Next.js 15.4.1, Pages Router (`pages/`)
- React 19.1.0, TypeScript (strict), Tailwind CSS 4, shadcn/ui (Nova, Base UI)

PostgreSQL, Prisma, authentication, ESLint, Prettier, tests, and queues are **not installed**.

## Approved next steps (ADR-011, ADR-012)

1. Upgrade Next.js to 15.5.27 (security patch), then to Next.js 16.
2. Migrate to the App Router. After that, all new work uses `app/`.

Until both are done, do not build new screens. Keep `pages/login.tsx` working throughout.

## Non‑negotiables

- Never commit secrets or `.env*` files (except `.env.example`).
- Never overwrite, reset, or discard uncommitted work.
- Never claim a feature works without running the checks that exist.
- Never assume an external API, webhook, or portal is available.
- Every query and mutation must be scoped to the current **organisation** (agency isolation).
- Distinguish **done**, **tested**, and **unverified**.

## Where to look

| Topic | File |
| --- | --- |
| Product vision | `docs/PRODUCT.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Modules | `docs/MODULES.md` |
| Data (proposed) | `docs/DATA-MODEL.md` |
| Roles | `docs/PERMISSIONS.md` |
| Lettings lifecycle | `docs/WORKFLOWS.md` |
| Integrations | `docs/INTEGRATIONS.md` |
| Decision log | `docs/DECISIONS.md` |
| Phases | `docs/ROADMAP.md` |
