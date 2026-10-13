# Feature flags and staged MFA

**Status:** Implemented foundation with follow-up hardening in progress. Unit, disposable-database integration, browser (including shared-sandbox MFA mutation and cleanup), and production-build verification pass. Company-profile controls, public-sign-up disablement, production release-lock activation, deployment, commit, and push remain incomplete.

**Owner decisions (2026-10-13):**

- Feature flags are built in-house using the existing PostgreSQL database; no third-party service is introduced.
- “Company” targeting uses the existing `Workspace` tenant boundary.
- “Zayto users” means identities with an active internal platform role, never an email-domain check.
- Evaluation precedence is Zayto testing enablement, then an explicit workspace override, then the global default.
- The MFA flag starts disabled globally and disabled for Zayto users.
- Platform Owners receive global and Zayto-audience controls now. Workspace override storage and evaluation are implemented now, while controls on a company profile wait until that profile exists.
- At release, required security flags such as staff MFA become protected from accidental disabling.

## 1. Outcome

Add a reusable, server-evaluated feature-flag foundation that can release product capabilities globally, to one customer workspace, or to verified Zayto staff for testing. Put the existing authenticator-app MFA gate behind the first flag so development logins stop prompting for 2FA while the release implementation remains available.

Feature flags control availability, not authorisation. A flag can never create workspace membership, platform access, a permission, an entitlement, or access to a record. Existing server-side authentication, workspace isolation, RLS, and role checks always run independently.

## 2. Included in this slice

- A fixed, code-owned flag key for `staff_mfa` with human-readable database configuration.
- Global enabled/disabled state.
- Zayto-audience enabled/disabled state, determined by an active platform role.
- Per-workspace three-state override: inherit, enabled, or disabled.
- A server-only evaluator with one documented precedence rule.
- Platform Owner administration at `/platform/feature-flags`.
- Audited global and Zayto-audience changes.
- Database/application support for workspace overrides, ready for a later company profile screen.
- The existing MFA gate conditional on the evaluated `staff_mfa` flag.
- Unit, database-isolation, and browser coverage.
- Updated architecture, permissions, roadmap, and decision documentation.

## 3. Explicitly deferred

- A company directory or company profile screen.
- Workspace override controls in the UI until that company profile exists.
- Percentage rollouts, random cohorts, schedules, geography/device targeting, experiments, and multivariate values.
- Individual-person overrides. The only person audience is verified Zayto staff as a group.
- A third-party feature-flag provider.
- Flags as substitutes for commercial entitlements or role permissions.
- Production deployment and the final release lock activation.

## 4. Flag vocabulary and precedence

Each flag has a stable code key, display name, description, global state, Zayto-audience state, lifecycle status, and timestamps. Keys are defined in TypeScript so a misspelt or unknown flag defaults to disabled.

Workspace overrides have two stored values (`enabled` or `disabled`); absence means `inherit`. The company-profile UI will eventually present all three choices.

Evaluation for a signed-in identity and optional workspace:

1. If the identity has any active internal platform role and the flag is enabled for Zayto users, return enabled.
2. If a verified workspace context has an explicit override, return that override.
3. Otherwise return the global state.
4. Unknown, inactive, or malformed ordinary product flags return disabled. An unreadable security control such as `staff_mfa` returns enabled so a database failure cannot silently bypass it. Management denials are audited; operational error monitoring remains a release task.

The Zayto testing audience can therefore test a feature inside a workspace even when that workspace or the global audience is disabled. It does not give the tester membership of that workspace.

## 5. Proposed database slice

### `FeatureFlag`

- `id` UUID primary key.
- `key` unique, immutable code key.
- `displayName` and `description` for the internal admin UI.
- `globalEnabled` boolean, default false.
- `zaytoUsersEnabled` boolean, default false.
- `status` (`active` or `retired`).
- `createdAt` and `updatedAt`.

This is global platform configuration, not customer data. Only a verified Platform Owner may change it. Authenticated application evaluation may read active definitions through tightly scoped server code and RLS.

### `WorkspaceFeatureFlagOverride`

- `id` UUID primary key.
- `workspaceId` UUID tenant boundary.
- `featureFlagId` UUID.
- `enabled` boolean.
- `changedByUserIdentityId` and `changedAt`.
- Unique `(workspaceId, featureFlagId)`.
- Workspace-aware indexing and foreign keys.

Platform Owners may manage overrides through the future company administration surface. Workspace users may only have an override evaluated for a workspace they are already authorised to enter. They cannot list or mutate configuration.

### Audit

Reuse `AuditEvent` rather than introducing a second history system. Record actor, action, outcome, flag key, old and new safe values, and workspace when applicable. Never record session tokens, MFA factors, or TOTP secrets.

## 6. Application structure

```text
core/feature-flags/domain/
  feature-flag.ts             # fixed keys, result and precedence rules
core/feature-flags/application/
  evaluate-feature-flag.ts    # server-only contextual evaluation
  manage-feature-flags.ts     # Platform Owner mutations and audit
core/feature-flags/data/
  feature-flag-repository.ts  # Prisma access under verified DB context
app/platform/feature-flags/
  page.tsx
  actions.ts
  feature-flag-form.tsx
```

Pages and actions ask for a named flag through the evaluator. They do not query flag tables directly or inspect email domains.

## 7. MFA integration

- Split “require a valid signed-in user” from “require AAL2 MFA”.
- Resolve enough verified access context to evaluate `staff_mfa` without exposing workspace data.
- `/dashboard` evaluates the user/global audience before choosing a context.
- `/dashboard/w/[workspaceSlug]` evaluates using the already verified candidate workspace; membership remains mandatory whether MFA is enabled or disabled.
- `/platform` evaluates the verified internal audience; Platform Owner authorisation remains mandatory.
- When disabled, continue after the ordinary verified Supabase session and skip `/mfa`.
- When enabled, preserve the existing TOTP enrol/challenge flow and safe return-path validation.
- Do not unenrol or delete existing factors when the flag is disabled.
- The initial seed/configuration is global false and Zayto false, so no development persona is prompted.

## 8. Platform Owner administration

Add **Feature flags** to platform navigation. The page lists code-owned flags and explains the audiences in plain English. Each row shows:

- Name and description.
- Stable key.
- Global state.
- Zayto testing state.
- Save action with confirmation feedback.
- A release-security notice for protected flags.

Every Server Action re-verifies the Supabase user and active Platform Owner role, validates the requested fixed key and booleans, writes atomically, and appends an audit event. Client-side hiding is convenience only.

Workspace overrides are not editable here in this slice. When the company profile is built, its feature tab will show `Inherit global`, `On for this company`, and `Off for this company`, plus the effective result and the source of that result.

## 9. Release protection

Add a server-only deployment setting such as `REQUIRE_STAFF_MFA=true`. When active:

- `staff_mfa` evaluates enabled for all staff regardless of a disabled database value.
- The Platform Owner page marks it as release-protected and refuses attempts to disable it.
- Startup/configuration validation fails safely if the value is malformed.
- It is documented as a release gate; enabling it in a deployed environment requires separate deployment approval.

The environment safeguard is deliberately one-way: it can require MFA, but it cannot weaken a database-enabled flag.

## 10. Migration and seed approach

1. Add the two tables, enums/constraints, indexes, relations, and RLS policies in one reviewed Prisma migration.
2. Seed/upsert only the fixed `staff_mfa` definition through an idempotent controlled script or migration statement, with both audiences disabled.
3. Never use `prisma db push` against the shared database.
4. Review generated SQL before asking to run `prisma migrate deploy`.
5. Applying the migration to the shared Supabase development database is a separate explicit approval step.

## 11. Test plan

### Unit tests

- Unknown ordinary flag defaults off; an unavailable security control fails on.
- Global off/on.
- Workspace inherit/on/off.
- Zayto audience enablement has highest precedence.
- An email address alone never creates Zayto-audience access.
- Release protection can force MFA on but never off.
- Retired/malformed flags default off.

### Database and authorisation tests

- Ordinary workspace members cannot change or list platform flag configuration.
- Platform Owners can manage flags without gaining customer-record access.
- A workspace override cannot be attached across workspace boundaries.
- One workspace's override is not visible/effective in another workspace.
- Successful and denied changes are audited.

### Browser tests

- With `staff_mfa` off, Account Owner, Platform Owner, dual-role, and no-access personas reach their existing destinations without `/mfa`.
- With the Zayto audience on, Platform Owner and dual-role personas require MFA; the customer-only Account Owner does not.
- With a workspace override on, only that workspace requires MFA.
- With global on and a workspace override off, that workspace skips MFA unless the user is in the enabled Zayto audience.
- Direct URL denial, themes, responsive layout, and existing role routing remain intact.
- `npm run check`, `npm run test:e2e`, and `npm run build` pass.

## 12. Delivery sequence and approval gates

1. **Done:** inspect current access/MFA code and confirm product decisions.
2. **Done:** write this implementation plan and record the decision.
3. **Done:** owner approved the security/authentication change and proposed tables.
4. **Done:** add schema, generate the client, create the migration, and review its SQL.
5. **Done:** the owner approved the feature, access-hardening, and migration-history permission migrations; all were applied to shared Supabase development and verified on 2026-10-13.
6. **Done:** implement evaluator, platform administration, audit, and conditional MFA.
7. **Done:** unit, disposable-database integration, browser (including shared-sandbox MFA mutation and verified cleanup), and production-build verification pass.
8. Report what is done, tested, deferred, uncommitted, and not pushed. Do not deploy or push without approval.
