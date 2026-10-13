# Platform user management

**Status:** Confirmed plan. The responsive read-only user details modal is implemented and browser-tested; editing, suspension, notifications, and audit-history UI have not started. Branch access will be handled in the future edit form but is intentionally omitted from the concise read-only modal.

## Outcome

Add an accessible view/edit modal to the Platform Users directory. Only a verified Platform Owner may use it.

The modal will show and edit:

- Display name.
- Sign-in email, updating Supabase Auth and the local identity record.
- Active or suspended user status.
- Platform Owner access.
- Customer memberships and fixed customer roles.
- Whole-workspace or selected-branch scope. A branch-limited membership requires at least one branch and may include several.

Internal IDs and creation dates remain read-only. A Platform Owner cannot suspend themselves or remove their own Platform Owner access. Existing protections for the final active Platform Owner and final active Account Owner remain mandatory.

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

1. Add and review the minimal suspension-reason database migration.
2. Add Platform Owner-only read/update services and preserve all existing final-owner and branch-scope invariants.
3. Add the responsive view/edit modal with clear validation and confirmation for sensitive changes.
4. Add restricted user and customer workspace screens.
5. Add basic Mailpit development notifications.
6. Add focused unit, database integration, and browser tests for successful changes and denied/unsafe cases.
7. Update architecture, permissions, data-model, and roadmap documentation.

Applying a shared database migration, adding secrets, committing, and pushing remain separate approval points.
