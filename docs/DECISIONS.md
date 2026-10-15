# Architectural decision log

Newest first. Status: **Accepted** | **Proposed** | **Superseded** | **Unresolved**.

## ADR-030 — Record pages use a profile sidebar and flat sections

- **Status:** Accepted (owner decision, 2026-10-15)
- **Context:** The first contact record put every group of details in its own bordered card (eight on one page), which the owner found boxy and hard to scan. Five alternatives were compared in the Design Lab (`/design-lab/contact`); the owner chose the **profile sidebar**.
- **Decision:** A record page (a single person, organisation, and later property, instruction, or tenancy) has a left **profile column** and a wide **working area**. The profile column holds identity (avatar, name, type, reference, primary actions), then the key contact lines, then the remaining details as icon-led label/value pairs separated by hairlines. The working area holds related records (for example People, Organisations, and later Properties) and Notes as plain sections with a heading, separated by dividers. On phones the order is identity, working area, then details.
- **Surfaces:** Cards are for self-contained items: metric tiles, a list or table, sign-in and error panels, and choice tiles. Do not wrap each group of fields on a record, or each timeline entry, in its own card. Forms inside a dialog use flat sections with headings and dividers, not nested cards.
- **Alignment:** page content is left-aligned against the navigation with a maximum width, not centred; only standalone panels (sign-in, error, not-found) are centred.
- **Scope:** Applied to the contact record, its edit form, notes, and people. Other screens move to the same pattern when they are next substantially changed; settings and platform administration screens are not being redesigned solely for this decision.
- **Date:** 2026-10-15

## ADR-029 — Human names use first-name and last-name fields

- **Status:** Accepted; first implementation is the user identity/profile (owner decision, 2026-10-14)
- **Decision:** Human records use separate `firstName` and `lastName` fields as the consistent CRM baseline for user identities and later applicants, landlords, tenants, guarantors, staff, and other people. The UI labels are **First name** and **Last name**. Either field may contain spaces, hyphens, apostrophes, diacritics, and multiple name parts; Zayto must not assume one token per field or invent a middle-name split. A normal display label is derived from the stored parts rather than stored as a competing full-name value.
- **Boundaries:** Organisations and other non-human parties use their organisation/trading/legal names, not person-name fields. Titles, preferred names, former names, mononyms, and legal-name history may be added when a real workflow requires them; they are not invented in this slice.
- **Migration:** Existing fictional sandbox names may be mapped explicitly. Imported or unknown full names must not be split heuristically; they require source mapping, user review, or a reported exception under ADR-028.
- **Date:** 2026-10-14

## ADR-028 — Import-ready core models and customer data portability

- **Status:** Accepted as an architectural requirement; migration functionality remains deferred (owner requirement, 2026-10-14)
- **Decision:** Core CRM models must support meaningful workspace-scoped external source identifiers, provenance, historical/inactive records, and time-aware relationships so established letting agents can later migrate properties, landlords, tenants, tenancies, documents, notes, and relevant history without redesigning the domain. Imported source facts and timestamps remain distinguishable from actions and audit events created within Zayto.
- **Validation:** Imperfect legacy data must be staged, mapped, validated, previewed, and either corrected or reported; it must not weaken validation for records created in Zayto. Eventual imports require duplicate detection, error reporting, idempotent safe retries, reconciliation, and workspace isolation.
- **Portability:** CSV and Excel are baseline future inputs. Source-specific APIs are optional adapters and cannot be assumed. Zayto data must remain exportable in documented, usable formats without dependence on proprietary database access or one CRM vendor.
- **Scope:** No import implementation, schema, provider, or infrastructure is approved by this decision. Detailed workflow and deferred choices are recorded in `.cursor/plans/customer-data-migration-and-onboarding.md`.
- **Date:** 2026-10-14

## ADR-027 — Security hardening, isolated database tests, and least-privilege database roles

- **Status:** Accepted and implemented; disposable PostgreSQL verification, shared-environment role cutover, and access-hardening migrations passed on 2026-10-13 (owner decisions, 2026-10-13)
- **Decision:** Use a disposable local PostgreSQL database for RLS, cross-workspace, cross-branch, constraint, audit, and concurrency tests. Docker Desktop is the approved local runner. The test database uses fictional credentials, memory-backed storage, and is destroyed after each run; automated integration tests must refuse non-local or incorrectly named databases.
- **Database roles:** The deployed website uses `zayto_app` for DML only. Prisma deployment uses a separate `zayto_migrator` login that owns Zayto tables, types, functions, and migration history. Both roles are non-superuser, cannot create roles/databases, cannot bypass RLS, and do not inherit privileges. The migration credential is server/operator-only and never available to website runtime code.
- **RLS threat model:** RLS is defence against omitted tenant filters and accidental cross-workspace queries. It is not a boundary against a fully compromised website process because the runtime connection sets PostgreSQL request context itself. Application authorisation, parameterised queries, server-only modules, least-privilege object ownership, and audit remain mandatory.
- **Access invariants:** A named-branch membership needs at least one branch. Branch-scoped staff visibility includes workspace-wide staff and staff sharing a branch, but excludes other-branch-only staff. Role mutations are serialised by workspace and may not remove the final active Account Owner. Sensitive denials are audited without credentials or sensitive content.
- **Feature failure:** Ordinary unavailable flags fail off; unavailable security controls such as required staff MFA fail on. At release MFA applies to all Zayto platform users and agency staff, while future participant policy remains separate.
- **Hosting:** Vercel is the intended first production host. Production builds require the MFA release safeguard. Security headers are set in Next.js; UK execution/logging/data-processing configuration, backups, monitoring, rate limiting, production email, and recovery remain release gates.
- **External state:** Public Supabase Auth sign-up is disabled so only existing/invited users can sign in. The live Auth settings endpoint was independently verified on 2026-10-13, and `npm run check:release` continues to enforce the setting for release.
- **Date:** 2026-10-13

## ADR-026 — Server-evaluated feature flags and staged MFA enforcement

- **Status:** Accepted and implemented (owner decision, 2026-10-13)
- **Decision:** Build feature flags in the existing PostgreSQL database, evaluated only by server-side application code. Flags support a global default, an optional explicit workspace override, and a testing audience made up of identities with an active internal platform role. Do not infer internal users from an email domain. Feature flags control availability and never replace authentication, workspace membership, permissions, entitlements, RLS, or record/field checks.
- **Precedence:** For an active staff identity: enabled Zayto testing audience first, then explicit workspace override, then global state. A missing override inherits. Unknown, inactive, or malformed ordinary flags fail disabled; an unreadable security control such as required staff MFA fails enabled under ADR-027.
- **Administration:** Platform Owners manage global and Zayto-audience settings in the internal shell. Changes are validated server-side and audited. Workspace override storage and evaluation are included in the foundation; the UI belongs on the future company profile.
- **MFA staging:** Put the existing staff TOTP gate behind `staff_mfa`. It starts disabled globally and for Zayto users during proof-of-concept development. Disabling enforcement does not delete enrolled factors. MFA remains a release requirement under ADR-015 and ADR-025.
- **Release protection:** The server-only `REQUIRE_STAFF_MFA=true` deployment setting forces staff MFA on and prevents it being disabled from the admin screen. Vercel production builds fail when it is not true. It may strengthen but never weaken the database setting. Deployment still requires separate approval.
- **Date:** 2026-10-13

## ADR-025 — Initial operator roles and separate platform administration

- **Status:** Accepted and implemented (owner decision, 2026-10-12)
- **Customer roles:** Use the fixed workspace roles `workspace_owner`, `agency_admin`, `branch_manager`, `negotiator`, `property_manager`, `accounts`, and `read_only`. The UI calls `workspace_owner` **Account Owner**. Read Only is exclusive. Only an Account Owner can grant or remove Account Owner; self-role changes and removal of the final active Account Owner are denied. Branch Managers may view workspace-wide staff and staff sharing one of their branches, but not other-branch-only staff; they cannot invite people or change roles.
- **Platform role:** `platform_owner` is stored outside workspace membership and opens a distinct Zayto internal shell. It does not provide standing access to customer records. Future support access requires a separately approved, workspace-specific, time-limited, justified, strongly authenticated, and audited design.
- **Routing and assurance:** `/dashboard` safely resolves or presents the available contexts, customer workspaces use `/dashboard/w/[workspaceSlug]`, and internal administration uses `/platform`. Server checks protect direct URLs. Supabase authenticator-app TOTP at AAL2 is implemented and remains required for release; ADR-026 permits feature-flagged enforcement during proof-of-concept development.
- **Development personas:** The local allow-list includes fictional Account Owner, Platform Owner, dual-context, and no-access identities so browser tests prove each routing outcome. They use real magic-link and TOTP flows; there is no authentication bypass.
- **Deferred:** Invitations, customer-defined roles, production email, MFA recovery operations, and product-module permissions.
- **Date:** 2026-10-12

## ADR-024 — Commercial independence from Blinc

- **Status:** Accepted (owner requirement, 2026-10-12)
- **Decision:** Zayto is an independent product. It must not assume access to Blinc software, data, documents, intellectual property, supplier credentials, commercial terms, or integrations. Any imported artefact needs documented provenance and permission. Zayto contracts with its own providers, or supports customer-contracted providers through approved adapters.
- **Date:** 2026-10-12

## ADR-023 — Tenant isolation uses application scoping and PostgreSQL RLS from the first slice

- **Status:** Accepted (owner decision, 2026-10-12). Supersedes ADR-006's proposed timing.
- **Decision:** Every tenant-owned row is scoped by `workspaceId`. Server-side application code must derive the active workspace from verified access and filter every query and mutation. PostgreSQL Row Level Security is added with the first workspace-owned records as defence in depth, not deferred until later scale work and not used as a substitute for application checks.
- **Testing:** Each repository and mutation needs tests proving that another workspace is denied. Participant-facing data also needs tests proving that joint applicants and other parties cannot read one another's private fields or evidence.
- **Date:** 2026-10-12

## ADR-022 — Identity, membership, participation, and personal portal

- **Status:** Accepted (owner decision, 2026-10-12)
- **Decision:** One global login identity may operate in many capacities. Business operators use workspace-specific `Membership`s. Applicants, tenants, guarantors, and invited landlords use resource-specific `Participation`s and access grants rather than broad workspace membership. Roles are never global customer roles.
- **Personal data:** A small user-controlled personal profile may reduce repeated entry. Each workspace keeps its own operational person record and history. Information is shared into a case explicitly; sensitive evidence and results remain case-scoped. Joint applicants' and guarantors' financial, identity, and referencing information is private by default.
- **Portal:** One personal portal may aggregate the signed-in user's authorised applications, tenancies, guarantees, and landlord relationships across workspaces. It must evaluate each participation separately and must not expose one workspace or relationship to another.
- **Commercial treatment:** External participants do not consume staff seats. Plans may instead meter cases, properties, tenancies, storage, messages, or chargeable provider transactions.
- **Date:** 2026-10-12

## ADR-021 — Independently usable modules and three-layer access

- **Status:** Accepted (owner decision, 2026-10-12)
- **Decision:** Keep one modular monolith, but make CRM, pre-tenancy, property management, accounting, referencing, AML, Right to Rent, and future modules independently entitled and usable. Standalone services must not require an unrelated CRM subscription or depend on another optional module's internals.
- **Access:** Every protected operation checks three separate questions on the server: (1) workspace entitlement or allowance, (2) the user's permission, and (3) access to the specific resource and fields. Navigation visibility is not enforcement.
- **Commercial model:** Plans, prices, free allowances, trials, add-ons, usage limits, and pay-per-use terms remain unresolved. They will be represented through versioned catalogue and entitlement concepts rather than hard-coded plan names.
- **Native checks:** Referencing and AML are Zayto-owned products and workflows. External specialists may supply data and verification services through adapters. Zayto will not invent legal, compliance, or underwriting rules.
- **Date:** 2026-10-12

## ADR-020 — Workspace is the tenant and commercial boundary

- **Status:** Accepted (owner decision, 2026-10-12). Supersedes ADR-005's organisation-only boundary.
- **Decision:** `Workspace` is the hard boundary for tenant data, subscriptions, entitlements, usage, and business permissions. Initial workspace types are agency, independent landlord, and internal platform. An organisation may own a workspace, while an individual landlord may own one without being modelled as a company.
- **Identity:** One identity may hold different memberships and participations across many workspaces. Selecting a business workspace is explicit; object identifiers never select or prove workspace access.
- **Administration:** Platform administration is separate from customer membership and grants no standing access to customer data. Support access will require separately approved controls and audit.
- **Date:** 2026-10-12

## ADR-019 — Authentication provider: Supabase Auth

- **Status:** Accepted (owner decision, 2026-10-11). Supersedes ADR-007.
- **Decision:** Use **Supabase Auth** in the existing London project for identities, sessions, passwordless email sign-in, Google sign-in, invitations, and MFA. Staff remain invite-only and must reach the required MFA assurance level before accessing CRM data (ADR-015). Supabase's provider-level public sign-up setting must be disabled; an application allow-list alone is not the invite-only boundary.
- **Application tenancy:** Supabase Auth identifies the person but does not model Zayto workspaces or access. ADR-020 and ADR-022 now define Zayto-owned workspaces, memberships, participations, and permissions. Supabase metadata must not be the authority for customer roles or tenant access.
- **Data access:** Prisma remains the server-side data layer for CRM records. The browser-facing Supabase Data API stays off for CRM data. Supabase browser credentials may be used only as documented for Auth; secret/service-role credentials remain server-only.
- **Why changed:** Supabase Auth already provides managed magic links, Google OAuth, invitations, sessions, and MFA assurance levels in the service we have selected. This removes duplicated authentication infrastructure and avoids custom MFA gating required by Better Auth for magic-link and social sign-ins.
- **Development sign-in:** In the local proof of concept only, a server-side Supabase admin call generates a one-time hashed token without asking Supabase to send it. With `SANDBOX_QUICK_SIGN_IN` enabled, a labelled persona selector verifies that token server-side and creates the normal Supabase cookie session; disabling the flag delivers the equivalent link to local Mailpit over its HTTP API. Both paths are restricted to `SANDBOX_AUTH_EMAILS`. Quick sign-in is hard-disabled in production, and Mailpit must be replaced by an approved UK-compatible email provider before deployment.
- **SMS:** Real phone MFA still needs an approved messaging provider and may incur cost. Do not select or connect one without owner approval. **Unresolved.**
- **Date:** 2026-10-11

## ADR-018 — Light and dark themes, responsive conventions

- **Status:** Accepted (owner decision, 2026-10-11)
- **Decision:** Light is the default; users can choose Light, Dark, or System (follows the device). Built in-house following Next.js's "preventing flash before hydration" guide (a small `<head>` script plus a cookie), not the `next-themes` package, to avoid a dependency for ~100 lines of code. The `.dark` class matches shadcn's convention so its components switch automatically.
- **Persistence:** the `zayto-theme` cookie (one year, this device) for now. Once accounts exist, also save it to the user's Zayto profile so it follows them between devices; the cookie stays as the fast first-paint source.
- **Tokens:** every semantic token has a light and dark value in `styles/globals.css`, including status colours (success, warning, danger, info, each with solid and soft forms). `styles/theme-contrast.test.ts` checks 33 text/background and control pairs in both themes against WCAG 2.2 AA on every `npm run test`. Dark mode uses a lighter blue on near-black for clear contrast.
- **Responsive and touch:** Tailwind's default breakpoints; slide-out navigation below 1024px, collapsible sidebar above; rules for tables, forms, modals, and dashboards in `.cursor/rules/ui-design.mdc`. On touch screens, controls are at least 44px (global CSS rule keyed on `pointer: coarse`, so desktop stays compact).
- **Interaction coherence (owner decision, 2026-10-14):** design around complete user tasks rather than exposing one button per underlying operation. Related edits should normally use one clear Edit/Manage entry point and one structured modal or page, with one reviewed save where the data must change together. Keep list rows and cards visually calm through progressive disclosure. Separate controls remain appropriate for genuinely distinct tasks, and long or multi-stage work belongs on a page rather than an overloaded modal.
- **Date:** 2026-10-11

## ADR-017 — Brand colours and typography as design tokens

- **Status:** Accepted (owner decision, 2026-10-11); visual direction revised by owner on 2026-10-15
- **Decision:** All brand colours live once in `styles/globals.css` as `--brand-*` variables, mapped to shadcn's semantic tokens (`primary`, `background`, `sidebar`, `highlight`, and so on). Components use only the semantic Tailwind classes (`bg-primary`, `bg-sidebar`), never hex values, so a rebrand is a change to one file. Typeface is Inter via `next/font`. Light and dark values for every token are in ADR-018.
- **Visual direction revised by owner (2026-10-15):** use the **Deep Navy** Design Lab palette, the rounded and softly elevated component treatment from the Aubergine direction, and the clean conventional table treatment from Cobalt. Light mode uses an off-white canvas, white floating surfaces and blue-grey fills; dark mode uses layered deep-navy surfaces. This supersedes the earlier cobalt-only, black/charcoal direction. Status colours remain functional rather than decorative.
- **Accessibility:** dark mode uses a lighter navy-blue accent where needed against deep surfaces. Input borders, text, focus rings and semantic status pairs continue to be enforced by `styles/theme-contrast.test.ts` against WCAG 2.2 AA.
- **Date:** 2026-10-11

## ADR-016 — Database host: Supabase (London)

- **Status:** Accepted (owner decision, 2026-10-11); project created and connected (London, PostgreSQL 17)
- **Decision:** Host PostgreSQL on **Supabase** in the London region. Use Prisma from our server for CRM data and Supabase Auth for identity and sessions (ADR-019). Do **not** expose CRM data through the browser-facing Supabase Data API.
- **Database roles (updated by ADR-027):** the app connects through the Session pooler as DML-only `zayto_app`, never `postgres`. A separate `zayto_migrator` owns and changes Zayto database objects and migration history. The earlier proof-of-concept permission for `zayto_app` to own tables and create databases was withdrawn in the verified shared Supabase cutover on 2026-10-13.
- **Encryption:** connections must use TLS and verify Supabase's certificate authority, stored at `certs/supabase-ca.crt` (public, safe to commit). The file is Supabase's published "Supabase Root 2021 CA" (valid to April 2031), checked against the root the database actually presents (SHA-256 fingerprints match). The app passes it to `pg`; Prisma's CLI receives it as the `sslcert` URL parameter (Prisma's name for the root certificate, not libpq's `sslrootcert`). "Enforce SSL" is on and the app connection was retested successfully on 2026-10-11. Data API: turned off by the owner.
- **Storage lean:** Supabase Storage (same London project, private buckets) for documents, to be confirmed under ADR-008.
- **Constraints:** Free tier is for the proof of concept only (no real tenant/landlord data). Move to a paid plan with backups before real data; ask the owner before any paid upgrade.
- **Date:** 2026-10-11

## ADR-015 — Data residency, MFA, and agency onboarding

- **Status:** Accepted (owner decision, 2026-10-11)
- **Decision:** All agency and personal data is stored in the **UK only** (London region) for the database, file storage, and any provider that holds personal data. Staff **must** use two-step login (MFA) at release. ADR-026 allows enforcement to remain feature-flagged off during proof-of-concept development, with a release safeguard that can force it on. Agencies are **invite-only** for the proof of concept: the owner creates each agency workspace; there is no public agency sign-up.
- **Updated by ADR-020 and ADR-022:** one identity may belong to several workspaces and participate in cases across several organisations. Whether independent landlords may self-register for a free or paid workspace remains unresolved.
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

- **Status:** Superseded by ADR-023 (timing confirmed)
- **Context:** Application `organisationId` filters can be missed.
- **Decision lean:** Add PostgreSQL RLS as defence in depth after basic Prisma scoping works. Not required for the first schema spike. The app already connects as `zayto_app` (cannot bypass RLS), so policies will apply when added.
- **Date:** 2026-10-11

## ADR-005 — Multi-tenant isolation

- **Status:** Superseded by ADR-020
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
