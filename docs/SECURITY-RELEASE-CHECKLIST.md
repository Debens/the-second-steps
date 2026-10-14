# Security release checklist

Zayto is **not ready for real customer data or production release** until every required item below is checked and evidenced. `npm run check:release` automates only the configuration checks it can safely observe; it does not replace this review.

## Identity and authentication

- [x] Supabase **Allow new users to sign up** is disabled and the live Auth settings endpoint confirms it (2026-10-13); `npm run check:release` enforces it for release.
- [ ] Production invitation and email delivery use an approved UK-compatible provider.
- [ ] `REQUIRE_STAFF_MFA=true` is set for Vercel production and cannot be overridden off.
- [ ] All Zayto platform users and agency staff complete TOTP at AAL2.
- [ ] MFA recovery, lost-device, staff identity verification, and emergency support procedures are approved and tested.
- [ ] Login, magic-link generation, MFA attempts, and recovery endpoints have suitable rate limits and abuse monitoring.

## Tenant access and database

- [x] `scripts/database/split-database-roles.sql` has been reviewed, applied by an authorised Supabase administrator, and its ownership report checked (2026-10-13).
- [ ] Vercel runtime has only `DATABASE_URL` for `zayto_app`; deployment/migration automation alone has `MIGRATION_DATABASE_URL` for `zayto_migrator`.
- [x] The hardening migrations are applied to shared Supabase and verified without weakening forced RLS (2026-10-13).
- [x] `npm run test:integration` passes against the disposable Docker database (2026-10-13).
- [ ] Every product repository added later has cross-workspace and, where relevant, cross-branch/cross-participant tests.
- [ ] Supabase backups and point-in-time recovery meet the agreed recovery point and recovery time; a restore has been rehearsed.

## Application and Vercel

- [ ] `npm run check`, `npm run test:integration`, `npm run test:e2e`, `npm run build`, and `npm run check:release` pass in CI.
- [ ] Vercel production functions run in an approved UK region.
- [ ] Vercel logs, analytics, caching, subprocessors, retention, and data-processing terms are approved for the data Zayto will hold.
- [ ] CSP, anti-framing, content-type, referrer, permissions, HSTS, and removal of `X-Powered-By` are verified on the deployed domain.
- [ ] Production environment variables and access are reviewed; preview environments use no production data or credentials.
- [ ] Error monitoring and operational alerts are configured without sensitive content.
- [ ] Dependency audit findings have been reviewed; no unresolved deployed-runtime high/critical vulnerability remains.

## Data protection and operations

- [ ] Data inventory, controller/processor roles, lawful bases, privacy information, retention, access, correction, export, and erasure processes are approved.
- [ ] Any customer import/export process has approved authorisation, staging retention/deletion, error-report privacy, reconciliation, and audit controls.
- [ ] Document storage is private, UK-hosted, malware/type/size checked, and uses short-lived authorised downloads.
- [ ] Audit retention, access, monitoring, and incident-response procedures are approved.
- [ ] No real landlord, applicant, tenant, guarantor, identity, banking, or financial data is loaded before this checklist is complete.

## Development-only tests

The default browser suite does not delete shared Supabase MFA factors or change shared feature flags. The destructive sandbox MFA scenario runs only with `RUN_AUTH_MUTATION_E2E=true` after explicit approval, and should move to an isolated Auth project before CI.
