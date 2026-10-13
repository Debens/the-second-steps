# Platform users and customers

**Status:** Implemented and verified on 2026-10-13. The shared Supabase migration is applied. Code-quality, disposable-database integration, production-build, and shared-sandbox browser checks pass. Commit and push remain pending.

## Confirmed outcome

Add small, clean Platform Owner administration areas without granting access to customer CRM records:

- `/platform/users`: read-only directory of sandbox identities with name, email, status, access type, customer memberships, and creation date.
- `/platform/customers`: searchable read-only customer list with type, status, branch/user counts, and creation date.
- Customer profile tabs for Overview, Branches, and Feature flags.
- Audited three-state customer feature controls: inherit, on, or off, with the effective result shown.

The tables support simple search and responsive card layouts on smaller screens. Create/edit/suspend flows and detail modals are deliberately deferred.

## Security boundary

- Every page and action re-verifies the signed-in identity and active Platform Owner assignment on the server.
- RLS exposes only the account/customer metadata needed by this internal directory.
- Customer feature changes are validated, audited, and isolated to the selected workspace.
- The staff MFA release safeguard cannot be forced off.
- Ordinary workspace members cannot list platform directories or mutate customer feature settings.

## Sandbox fixtures

- Olivia Hart — `owner@zayto.local`
- Theo Grant — `platform.owner@zayto.local`
- Maya Ellis — `dual.owner@zayto.local`
- Noah Reed — `no.access@zayto.local`
- Oakfield Lettings / Oakfield Lettings Limited (Demo), with a fictional Main Branch and contact/address details.

All fixture details are fictional and safe for the development sandbox.
