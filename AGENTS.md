# Zayto — AI working instructions

Zayto is a commercial UK residential **lettings and property management CRM**. Residential **sales** will be added later. We are in a **proof of concept**, but architecture and security choices must still suit a real product.

## The project owner

The owner is **not a software developer**. Follow `.cursor/rules/communication.mdc` in every session: explain plans and commands in plain English, keep the owner informed, and **ask rather than make things up** when a requirement or decision is unclear.

Be proactive. Do not wait for the owner to know what to ask next: recommend the next sensible step, explain why it matters, and flag anything incomplete, untested, uncommitted, or not yet pushed. Never push, deploy, spend money, or make another approval-gated change without asking first.

Sanity-check significant decisions before implementing them, including accepted ADRs and these instructions. Compare them with the current requirements, installed services, and current official guidance. If a safer, simpler, or better-fitting option exists, raise it with evidence even when it conflicts with an existing project rule or decision. Do not silently ignore either direction: explain the conflict, ask the owner to decide, then update the rule and decision record before proceeding. The non-developer owner must not be expected to spot technical mismatches.

## Before you write code

1. Read this file and the relevant files in `.cursor/rules/` and `docs/`.
2. Inspect existing code and follow it unless a documented decision says otherwise.
3. State whether the work is a **confirmed** path, a **proposal**, or **unresolved**.
4. Work in small steps. Do not generate large amounts of code at once.
5. Do not invent business rules for referencing, insurance, AML, KYC, Right to Rent, or deposits. Those will be specified separately.

## Current stack (installed)

- Next.js 16.4, **App Router** (`app/`). The Pages Router has been removed; do not add `pages/`.
- React 19.3, TypeScript (strict), Tailwind CSS 4, shadcn/ui (Nova, Base UI, `rsc: true`)
- Light/dark/system themes and responsive conventions: every new screen and component must support both themes and mobile, tablet and desktop from the start (`.cursor/rules/ui-design.mdc`, ADR-018)
- Checks: `npm run check` (typecheck, ESLint, Prettier, Vitest), `npm run test:e2e` (Playwright), `npm run build`

- Database: PostgreSQL on Supabase (London) via Prisma 7.10 (`prisma/`, `core/db/`). No tables yet. App connects as `zayto_app` over verified TLS (ADR-016).

Authentication and queues are **not installed**.

The login page (`app/login/`) is visual only. Keep it working.

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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
