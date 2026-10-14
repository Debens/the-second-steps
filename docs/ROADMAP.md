# Roadmap

Dates are not committed. Phases are sequences, not promises. Pricing, named plans, and the first commercial product slice remain unresolved.

## Phase 0 — Existing proof-of-concept foundation

Implemented:

1. Next.js 16 / React 19 App Router application shell
2. Light, dark, and system themes with responsive conventions
3. ESLint, Prettier, Vitest, and Playwright tooling
4. Supabase Auth local magic-link sandbox, feature-flagged TOTP mechanism, and protected role-aware shells
5. Prisma/PostgreSQL connection plumbing with verified TLS in code
6. Workspace, membership, branch-scope, fixed-role, RLS, and audit-event foundation
7. Separate customer workspace and Zayto Platform Owner shells
8. Server-evaluated global, Zayto-user, and workspace feature-flag foundation
9. Read-only Platform Owner user/customer directories and customer feature-flag controls
10. CI checks for code quality, production build, and database integration
11. Product, architecture, security, and decision documentation

Not implemented: CRM records, participants, entitlements, invitations, MFA recovery operations, production delivery, rate limiting, backups suitable for real data, browser/dependency-audit CI gates, or product modules. Public Supabase sign-up is disabled and independently verified.

## Phase 1 — Workspace and security foundation (confirmed direction)

Before customer data:

1. Workspace boundary and Account Owner role - **foundation implemented**
2. Operator memberships, minimal roles, and branch scope - **implemented and verified, including shared hardening migrations**
3. Explicit active business-workspace context - **implemented**
4. Staff/Account Owner MFA mechanism - **implemented behind a development flag**; release enforcement and recovery remain
5. Server-side entitlement, permission, resource, and field checks
6. Audit-event foundation - **implemented for feature flags and role changes; broader access audit remains**
7. Application `workspaceId` scoping plus PostgreSQL RLS - **implemented and verified for foundation tables**
8. Cross-workspace and cross-role tests - **browser and disposable Docker database coverage pass**
9. Least-privilege runtime/migration role split - **implemented and verified on shared Supabase**
10. CI gates - **code quality, production build, and database integration implemented**; browser tests and dependency audit remain
11. Platform Owner and customer account administration: first-name/last-name editing and branch-scoped customer user identity visibility are verified on shared Supabase; the consolidated customer Settings area and audited customer-detail editing are locally verified, while branch user views, branch-scope management, invitations, and suspension controls remain planned in `.cursor/plans/customer-account-and-access-management.md`
12. Human-readable audit history on the relevant user and customer administration screens
13. Production-ready account notifications with durable delivery, retries, templates, recipient rules, and communication preferences; local Mailpit messages may be used during development only

## Phase 2 — Participant and personal-portal foundation (confirmed direction)

1. Workspace-scoped people and controlled identity links
2. Small user-controlled personal profile
3. Participations, invitations, claims, and resource grants
4. Participant-private versus shared data classification
5. Personal portal shell aggregating authorised cross-workspace journeys
6. Cross-participant privacy tests, including joint applicants

## Phase 3 — Minimal commercial foundation (confirmed shape)

1. Module/product registry
2. Manually assigned workspace entitlements
3. Service orders and append-only usage events
4. Operator-seat versus external-participant distinction

Full pricing, billing provider, checkout, discounts, invoicing, plan catalogue, trials, and free allowances can wait until a product slice demonstrates value.

## Phase 4 — First vertical product slice (unresolved)

Candidates:

- Thin pre-tenancy applicant-to-tenant journey (current recommendation)
- Agency CRM property/landlord slice
- Independent-landlord management slice
- Standalone tenant referencing

Select one before designing module tables. Do not build every candidate together.

## Phase 5 — Standalone services and provider integrations

Native Zayto referencing, AML, identity, or Right to Rent case workflows may be added after the relevant product/legal rules, privacy disclosures, storage, jobs, and provider contracts are approved. External specialists remain adapters.

## Phase 6 — Tenant operations and property management

Incrementally add tenancy documents, maintenance, communications, inspections, renewals, compliance records, and move-out. Financial views must wait for an approved accounting boundary.

## Phase 7 — Commercial plans and freemium

Add versioned plans, free allowances, trials, add-ons, usage limits, pay-per-use checkout, billing reconciliation, downgrade behaviour, and abuse controls after pricing decisions. Free functionality must not create uncontrolled provider or storage costs.

## Deferred commercial capability — customer migration and onboarding

Do not build migration functionality now. Keep each relevant core CRM model import-ready under ADR-028, then schedule the controlled file/API import workflow before onboarding any established customer that depends on legacy data migration. Implementation depends on stable destination models plus approved production data-protection, document-storage, backup, recovery, support-access, and import-authorisation controls. See `.cursor/plans/customer-data-migration-and-onboarding.md`.

## Later

- Accounting ledger and reconciliation after separate design approval
- Richer agency CRM and property management
- Sales using shared neutral people/property concepts
- Landlord/tenant mobile experiences if justified
- Franchise/group structures and consolidated billing

## Explicitly blocked

- Real customer data before isolation, MFA, audit, backups, and recovery controls
- Invented referencing, AML, Right to Rent, insurance, deposit, or notice rules
- Assuming access to Blinc software, data, documents, credentials, or supplier arrangements
- Microservices without a demonstrated operational or regulatory need
