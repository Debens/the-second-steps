# Platform user management

**Status:** Confirmed plan. First-name/last-name editing is implemented and verified in code, unit tests, the disposable database, the production build, and browser coverage including a reversible shared-sandbox save. Its narrow Platform Owner update policy and split-name migration are applied to shared Supabase. Access editing, suspension, notifications, audit-history UI, and reliable sign-in email editing remain. Branch access will be handled in the future access form but is intentionally omitted from the concise details view.

## Outcome

Add an accessible view/edit modal to the Platform Users directory. Only a verified Platform Owner may use it.

The modal will show and edit:

- First name and last name through an explicit Edit, Save, and Cancel interaction. The read view remains the default.
- Sign-in email, updating Supabase Auth and the local identity record through a reliable synchronisation and recovery process.
- Active or suspended user status.
- Platform Owner access.
- Customer memberships and fixed customer roles.
- Whole-workspace or selected-branch scope. A branch-limited membership requires at least one branch and may include several.

Internal IDs and creation dates remain read-only. A Platform Owner cannot suspend themselves or remove their own Platform Owner access. Existing protections for the final active Platform Owner and final active Account Owner remain mandatory.

## Sign-in email sequencing

Sign-in email editing remains a confirmed requirement but is deferred from the first edit slice. Supabase Auth is the authentication authority while Zayto stores a local directory copy, and the two writes cannot share one database transaction. The development email allow-list and notifications to both the old and new addresses must also be handled. Implement email changes as a dedicated slice with explicit failure recovery and reconciliation; do not risk leaving the authentication and directory addresses inconsistent.

## Suspension behaviour

- Only Platform Owners may suspend or reactivate users and customers in this phase.
- Every suspension requires a short user-visible reason; private internal notes are not included.
- A globally suspended user may authenticate but receives a restricted account screen and cannot enter customer or platform functionality.
- A suspended customer blocks its workspace for every member. Users may still sign in, see the suspension reason and the instruction to contact their account manager, and use any other active customer access they hold.
- Reactivation removes the currently visible reason. Suspension and reactivation history remains in the audit trail.

## Development notifications

- Basic suspension and reactivation messages go to Mailpit only and are not production delivery.
- User changes notify the affected user.
- Customer changes notify the customer primary email and all active customer users, with duplicate addresses removed.
- Sign-in email changes notify both the old and new addresses.
- A development email failure is reported and audited but does not reverse an authorised account change.

Production delivery needs a durable outbox/queue, retries, templates, delivery status, recipient rules, and communication preferences. Suspension/reactivation messages are operational notices; their future preference and opt-out rules require an explicit product/legal decision. These items are recorded in `docs/ROADMAP.md`.

## Audit visibility

All email, status, platform access, membership, role, and branch-scope changes must be server-authorised and audited with safe old/new values. A later UI slice will show readable audit history on the relevant user and customer screens; sensitive credentials, tokens, and email contents must never be logged.

## Delivery sequence

1. Add audited Platform Owner-only first-name and last-name editing to the existing responsive user modal.
2. Add access editing for platform role, customer memberships, fixed roles, and branch scope while preserving all final-owner and branch-scope invariants.
3. Add and review the minimal suspension-reason database migration, suspension controls, and restricted user/customer screens.
4. Add reliable sign-in email editing with Supabase/local reconciliation and development notifications to both addresses.
5. Add the remaining basic Mailpit development notifications.
6. Add focused unit, database integration, and browser tests for each successful change and denied/unsafe case.
7. Update architecture, permissions, data-model, and roadmap documentation as each slice lands.

Applying a shared database migration, adding secrets, committing, and pushing remain separate approval points.
