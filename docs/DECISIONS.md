# Architectural decision log

Newest first. Status: **Accepted** | **Proposed** | **Superseded** | **Unresolved**.

## ADR-019 — Authentication provider: Supabase Auth

- **Status:** Accepted (owner decision, 2026-10-11). Supersedes ADR-007.
- **Decision:** Use **Supabase Auth** in the existing London project for identities, sessions, passwordless email sign-in, Google sign-in, invitations, and MFA. Staff remain invite-only and must reach the required MFA assurance level before accessing CRM data (ADR-015).
- **Application tenancy:** Supabase Auth identifies the person but does not model Zayto's customer agencies. Zayto will own its `Organisation`, `Membership`, `Branch`, and role/permission records in Prisma. Every CRM query still derives the organisation from the authenticated membership and scopes by `organisationId`.
- **Data access:** Prisma remains the server-side data layer for CRM records. The browser-facing Supabase Data API stays off for CRM data. Supabase browser credentials may be used only as documented for Auth; secret/service-role credentials remain server-only.
- **Why changed:** Supabase Auth already provides managed magic links, Google OAuth, invitations, sessions, and MFA assurance levels in the service we have selected. This removes duplicated authentication infrastructure and avoids custom MFA gating required by Better Auth for magic-link and social sign-ins.
- **Development email:** Hosted Supabase Auth cannot deliver into Mailpit running on localhost. The restricted Supabase development email service, a local Supabase stack, or a future SMTP provider must be chosen before implementing the email flow. Mailpit remains useful for Zayto-generated application emails. **Unresolved.**
- **SMS:** Real phone MFA still needs an approved messaging provider and may incur cost. Do not select or connect one without owner approval. **Unresolved.**
- **Date:** 2026-10-11

## ADR-018 — Light and dark themes, responsive conventions

- **Status:** Accepted (owner decision, 2026-10-11)
- **Decision:** Light is the default; users can choose Light, Dark, or System (follows the device). Built in-house following Next.js's "preventing flash before hydration" guide (a small `<head>` script plus a cookie), not the `next-themes` package, to avoid a dependency for ~100 lines of code. The `.dark` class matches shadcn's convention so its components switch automatically.
- **Persistence:** the `zayto-theme` cookie (one year, this device) for now. Once accounts exist, also save it to the user's Zayto profile so it follows them between devices; the cookie stays as the fast first-paint source.
- **Tokens:** every semantic token has a light and dark value in `styles/globals.css`, including new status colours (success, warning, danger, info, each with solid and soft forms). `styles/theme-contrast.test.ts` checks 33 text/background and control pairs in both themes against WCAG 2.2 AA on every `npm run test`. Dark mode uses a lighter indigo (`#8B84F2`) with navy text on buttons, because brand indigo is unreadable on navy.
- **Responsive and touch:** Tailwind's default breakpoints; slide-out navigation below 1024px, collapsible sidebar above; rules for tables, forms, modals, and dashboards in `.cursor/rules/ui-design.mdc`. On touch screens, controls are at least 44px (global CSS rule keyed on `pointer: coarse`, so desktop stays compact).
- **Date:** 2026-10-11

## ADR-017 — Brand colours and typography as design tokens

- **Status:** Accepted (owner decision, 2026-10-11); colours are temporary and expected to change
- **Decision:** All brand colours live once in `styles/globals.css` as `--brand-*` variables, mapped to shadcn's semantic tokens (`primary`, `background`, `sidebar`, `highlight`, and so on). Components use only the semantic Tailwind classes (`bg-primary`, `bg-sidebar`), never hex values, so a rebrand is a change to one file. Typeface is Inter via `next/font`. Light and dark values for every token are in ADR-018.
- **Palette:** midnight navy `#161D35` (sidebar, text), indigo `#6258E8` (buttons, active states, focus), amber `#F2AD54` (restrained accents), background `#F7F8FC`, borders `#DCE1EB`, cards `#FFFFFF`. No pink, teal, gradients or traditional estate-agency styling.
- **Accessibility adjustments:** amber is too light to be text on light backgrounds (1.9:1), so it is used only as a fill, with midnight text on it (8.6:1). `#DCE1EB` is kept for dividers and card edges, but input borders use a darker `#7F889E` (3.55:1 on white) so form fields meet the 3:1 rule for controls. Muted text is `#586079` (5.9:1).
- **Date:** 2026-10-11

## ADR-016 — Database host: Supabase (London)

- **Status:** Accepted (owner decision, 2026-10-11); project created and connected (London, PostgreSQL 17)
- **Decision:** Host PostgreSQL on **Supabase** in the London region. Use Prisma from our server for CRM data and Supabase Auth for identity and sessions (ADR-019). Do **not** expose CRM data through the browser-facing Supabase Data API.
- **App database user (owner-approved):** the app connects as `zayto_app`, not the `postgres` admin. It can create and use tables in the `public` schema and create the temporary database Prisma uses to check migrations, but it is not an admin and cannot bypass Row Level Security. Connection is via the Session pooler (port 5432).
- **Encryption:** connections must use TLS and verify Supabase's certificate authority, stored at `certs/supabase-ca.crt` (public, safe to commit). The file is Supabase's published "Supabase Root 2021 CA" (valid to April 2031), checked against the root the database actually presents (SHA-256 fingerprints match). The app passes it to `pg`; Prisma's CLI receives it as the `sslcert` URL parameter (Prisma's name for the root certificate, not libpq's `sslrootcert`). "Enforce SSL" is on and the app connection was retested successfully on 2026-10-11. Data API: turned off by the owner.
- **Storage lean:** Supabase Storage (same London project, private buckets) for documents, to be confirmed under ADR-008.
- **Constraints:** Free tier is for the proof of concept only (no real tenant/landlord data). Move to a paid plan with backups before real data; ask the owner before any paid upgrade.
- **Date:** 2026-10-11

## ADR-015 — Data residency, MFA, and agency onboarding

- **Status:** Accepted (owner decision, 2026-10-11)
- **Decision:** All agency and personal data is stored in the **UK only** (London region) for the database, file storage, and any provider that holds personal data. Staff **must** use two-step login (MFA). Agencies are **invite-only** for the proof of concept: the owner creates each organisation; there is no public sign-up.
- **Deferred (owner: decide later):** whether one login may belong to several agencies. Design so membership is a separate table either way; do not block it in the schema.
- **Date:** 2026-10-11

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

- **Status:** Accepted and done (2026-10-11): now Next.js 16.4.0, React 19.3.0. Next.js advisories cleared. Remaining `npm audit` items are development-time only: `braces` (shadcn CLI) and `mysql2` / `deepmerge-ts` (Prisma CLI). None of these ship in the deployed app. Revisit when those tools ship updates.
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
- **Lean:** Supabase Storage in the same London project, private buckets, short-lived signed URLs (see ADR-016). Confirm before the first document upload.
- **Date:** 2026-10-11

## ADR-007 — Authentication provider

- **Status:** Superseded by ADR-019 before installation.
- **Decision:** **Better Auth**, storing users and sessions in our own PostgreSQL, using its organisation feature for agencies, memberships, roles and invitations, and its two-factor feature (required per ADR-015). Custom password handling is rejected.
- **Why:** accounts stay in our UK database (simpler UK GDPR position), no per-user fees, and organisations/invitations match invite-only agency onboarding.
- **Note:** Confirm current Better Auth APIs from its official docs at install time. Changing auth requires owner approval.
- **Date:** 2026-10-11

## ADR-006 — Row Level Security

- **Status:** Proposed
- **Context:** Application `organisationId` filters can be missed.
- **Decision lean:** Add PostgreSQL RLS as defence in depth after basic Prisma scoping works. Not required for the first schema spike. The app already connects as `zayto_app` (cannot bypass RLS), so policies will apply when added.
- **Date:** 2026-10-11

## ADR-005 — Multi-tenant isolation

- **Status:** Accepted (design); not implemented
- **Decision:** Shared PostgreSQL, `organisationId` on tenant data, shared-schema. Not a database-per-agency for v1.
- **Why:** Simpler operations for a PoC and early commercial product. Revisit only if a customer contract requires physical isolation.
- **Date:** 2026-10-11

## ADR-004 — PostgreSQL and Prisma

- **Status:** Accepted (owner approved install, 2026-10-11)
- **Decision:** PostgreSQL as the system of record; Prisma as ORM and migration tool.
- **Why:** Relational data (tenancies, FKs, transactions) fits SQL. Prisma is widely used with Next.js.
- **Installed:** Prisma 7.10.0 (latest stable; the npm `latest` tag pointed at an 8.0 release candidate needing a newer Node.js), with the `@prisma/adapter-pg` driver. Schema in `prisma/schema.prisma`, settings in `prisma.config.ts`, client in `core/db/client.ts`, generated code in `core/db/generated/` (not committed). Commands: `npm run db:migrate` (create/apply a migration locally), `npm run db:deploy` (apply in production).
- **Audit note:** Prisma's command-line tool brings in `mysql2` and `deepmerge-ts` with high-severity advisories. Both run only on developer machines during Prisma commands (we use PostgreSQL, not MySQL) and are not in the deployed app. The only automatic fix is downgrading to Prisma 6; revisit when Prisma ships updates.
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
