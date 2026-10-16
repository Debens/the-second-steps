# Landlord leads, appraisals, and tasks (Chunk 5)

**Status:** Approved and implemented through 5C. On 2026-10-16 ADR-031 clarified that this is specifically the **Landlord leads** workflow, not applicant enquiries. The existing staff-facing Enquiries label still needs the separately approved rename; internal database/code names may remain temporarily. The checkpoint remains next.

## Outcome

Staff can log a landlord lead in seconds, move it through the agreed pipeline, book and record appraisals, and always see what needs doing next. Open landlord leads cannot be forgotten: each has an owned next action with a due date, and anything due or overdue appears on the workspace Overview.

The agreed visible pipeline is **New lead → Appraisal booked → Appraisal completed → Instruction won / Lost / Postponed** (`.cursor/plans/landlord-property-onboarding.md`). Winning a lead records the outcome only; the instruction itself is created in Chunk 6. Existing internal `Enquiry` names describe the implemented landlord-lead record and do not define the future applicant/property-enquiry model.

## Progress

- **5A (2026-10-16):** migration `20261016170000_enquiries_appraisals_tasks`, Prisma models, permissions, and `tests/integration/enquiry-security.test.ts` (28 database tests) are written and pass on the disposable database. After the independent review and its fixes, the owner approved it and it was applied to shared development Supabase and verified on 2026-10-16 (catalog check plus a live property check). **Next: 5B services** (Sonnet is sufficient; the security-critical part is done).
- **5B complete (2026-10-16):** enquiry domain rules now have 13 focused unit tests. The workspace-scoped services cover first-use starter lists and settings, enquiry create/update/list/get, locked stage changes with permanent history, closing and manager reopening, appraisal booking with explicit duplicate review and atomic contact/property conversion, completion/cancellation/did-not-attend, next actions, and the Overview needs-attention query. Assignees must be active, hold `enquiry.update`, and see the enquiry's branch. `tests/integration/enquiry-application.test.ts` covers list permissions, branch scope, assignment, conversion rollback, stage history, appraisal outcomes and tasks. `npm run check` passes (180 tests) and the disposable-database integration suite passes (149 tests). Next: 5C interface; the later Chunk 5 checkpoint still requires browser checks and the planned independent security review.
- **5C implemented (2026-10-16):** Enquiries navigation, responsive list and filters, quick capture, the profile-sidebar record, next-action and outcome controls, duplicate-aware appraisal booking and outcome capture, Overview attention panels, and admin-managed enquiry lists are present. Staff choices preserve the existing staff-directory RLS boundary: roles without directory visibility can assign only identities the database allows them to see. `npm run check` passes (180 unit tests), the disposable-database suite passes (150 tests), `npm run build` passes, and all non-mutating browser checks pass (26 passed, 2 explicitly gated tests skipped) when run serially because parallel sandbox sign-ins collide. The new browser checks cover navigation, quick-capture fields, Overview, settings, mobile and dark mode. Saving a quick enquiry, stage progression and the final duplicate-selection booking remain deliberately unmutated in shared-browser tests; their write paths are covered by the disposable-database application tests. Next: the Chunk 5 checkpoint, including the planned independent security review and a decision on an isolated or cleanable browser-write fixture.
- **Implementation change to note:** the starter lists are not inserted by the migration or at workspace creation. Under forced row-level security a migration cannot see existing workspaces, so the application adds the starter entries the first time an agency uses its lists (5B), inside that agency's own security context. The outcome for users is the same.
- **Also built in 5A:** properties, like contacts, now carry a protected open-enquiry count, so a property with an open enquiry cannot be archived (the agreed rule applies to both).
- **Independent review of 5A (2026-10-16, separate Opus agent):** no cross-agency or cross-branch leak; the property-review lessons held. Fixed before any shared application:
  - two people making the same stage change at once could leave a false history row credited to the wrong person; history (and, the same issue, property branch-transfer) records now must match a database-stamped change time (`stage_changed_at`, new `properties.branch_changed_at`);
  - branch staff could be locked out of their own enquiry when a linked contact or property later sat in another branch; links are now checked only when first made, and the protected counts update agency-wide for just those rows;
  - hidden lead sources and reasons could be newly chosen, a reason's outcome type could change, archived records could be linked, stage, completion and closing times could be forged, and a won enquiry could be reopened; all now refused;
  - the count protection now checks for the count triggers' owner, not merely a different role.
    42 enquiry database tests cover these, including the two concurrent-change races.
- **Carried into 5B by the review:** the services must assign appraisals, next actions and enquiry leads only to active members who can see the enquiry's branch (the database checks only that they belong to the agency).

## Owner decisions

Confirmed earlier in the landlord and property onboarding plan and still binding: quick landlord-lead capture needs a landlord name, at least one contact method, a property address or postcode, a lead source and a responsible branch; the lead source may be blank at first save but is required before an appraisal is completed; lost and postponed outcomes record a reason, postponed work may have a follow-up date, and both can be reopened; an appraisal records date and time, assigned staff, appointment status, expected monthly rent, recommended service type, proposed fee, notes and outcome; reminders are in-app only for now.

Decided on 2026-10-16:

- **Real records are created late.** An enquiry holds the typed name, contact details and address. Staff may instead pick an existing contact or property. The real contact and property records are created, or matched to existing ones with the usual duplicate warnings, when the appraisal is booked. Unqualified leads therefore never clutter the contact or property lists.
- **Lead sources** are a per-agency editable list, pre-filled with a UK lettings starter list (below).
- **Next actions** apply to enquiries and appraisals only in this chunk. A general to-do feature for any record is a later addition.
- **Who can work enquiries:** the same people who can create properties (Account Owner, Agency Admin, Branch Manager, Negotiator, Property Manager). Accounts and Read Only can only view. Branch Manager or higher can reopen lost or postponed enquiries. Account Owner and Agency Admin edit the agency's lists (as agreed in conversation: "editable by agency admins").
- **Lost and postponed reasons** are chosen from an editable list, with an optional note. A starter list is pre-filled.
- **No notes timeline on enquiries at first.** An enquiry has a short summary, its stage history and its next actions. A notes timeline can be added later in the same way as for properties.
- **One simple proposed fee** on an appraisal (percentage or fixed amount, VAT inclusive or exclusive). Full fee structures come with instructions in Chunk 6.
- **Enquiry branch transfer is deferred**, as for properties. It will reuse the property pattern (Branch Manager or higher, with a reason) when needed.

## Data design

All tables are workspace-owned, use workspace-aware composite foreign keys, force RLS, and give the runtime role no DELETE. Money is integer pence; times are stored in UTC and shown in UK time.

### `LeadSource` → `lead_sources` and `EnquiryOutcomeReason` → `enquiry_outcome_reasons`

Per-workspace lists: `name` (unique per workspace, case-insensitive), `status` (`active` or `hidden`), `sortOrder`. Reasons also carry `appliesTo` (`lost`, `postponed` or `both`). Hiding keeps history intact and never deletes; a hidden item cannot be newly chosen, and a reason's outcome type cannot change once created. The starter lists are added by the application the first time an agency uses its lists (see Progress).

Starter lead sources: Rightmove, Zoopla, OnTheMarket, Own website, Phone call, Walk-in, Landlord referral, Tenant referral, Existing landlord (another property), Social media, Leaflet or advert, Local event, Other.

Starter reasons — lost: Went with another agent, Fees too high, Decided to sell, Decided to let privately, Property not suitable, Could not contact, Other. Postponed: Landlord not ready yet, Waiting for tenants to leave, Waiting for refurbishment, Waiting for a sale decision, Other.

### `Enquiry` → `landlord_enquiries`

| Field                                                               | Rule                                                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `reference`                                                         | Immutable readable reference `ENQ-XXXXXXXX`, unique per workspace                                |
| `responsibleBranchId`                                               | Required; changes only through the branch-transfer pattern used for properties                   |
| `stage`                                                             | `new_enquiry`, `appraisal_booked`, `appraisal_completed`, `won`, `lost`, `postponed`             |
| `enquirerName`, `enquirerEmail`, `enquirerTelephone`                | Typed details; name required; at least one of email or telephone; validated like contact details |
| `addressBuilding`, `addressStreet`, `postcode`                      | Typed property details; postcode required (full address optional until appraisal booked)         |
| `contactId`, `propertyId`                                           | Optional links to real records, set at selection or at appraisal booking; same-workspace keys    |
| `leadSourceId`                                                      | Optional until an appraisal is completed                                                         |
| `leadMembershipId`                                                  | Optional member responsible for the enquiry                                                      |
| `outcomeReasonId`, `outcomeNote`, `followUpOn`                      | Reason required for lost and postponed; follow-up date optional and only for postponed           |
| `summary`                                                           | Optional internal summary (≤ 2,000)                                                              |
| `createdByMembershipId`, `createdAt`, `updatedAt`, `stageChangedAt` | Standard                                                                                         |

### `Appraisal` → `appraisals`

`enquiryId`, `scheduledAt`, `assignedMembershipId`, `status` (`scheduled`, `completed`, `cancelled`, `did_not_attend`), `expectedMonthlyRentPence`, `recommendedService` (`let_only`, `rent_collection`, `fully_managed`), proposed fee (`feeKind` percentage or fixed, `feeValue` in basis points or pence, `feeVat` inclusive or exclusive), `notes`, and `completedAt`. Several appraisals per enquiry are allowed (a rebooked visit); at most one is `scheduled` at a time. Fee fields are deliberately minimal here; effective-dated terms belong to Chunk 6.

### `EnquiryTask` → `enquiry_tasks`

The next-action mechanism: `enquiryId`, optional `appraisalId`, `title` (≤ 200), `dueOn` (date), `assignedMembershipId` (required), `status` (`open`, `done`, `cancelled`), and who and when it was completed. An open enquiry shows its earliest open task as its **next action**. An enquiry with no open task is flagged incomplete immediately. Overdue means `open` and `dueOn` before today (UK date).

### `EnquiryStageHistory` → `enquiry_stage_history`

Append-only: `enquiryId`, `fromStage`, `toStage`, `reason`, actor, timestamp. Written in the same transaction as every stage change. Moving backwards or to lost or postponed requires a reason.

### Rules the database enforces

- A stage change must have a matching history row written by the same actor in the same transaction (the same safeguard pattern as property branch transfers, with one history row per enquiry per transaction).
- Stage `won`, `lost` and `postponed` close the enquiry's open tasks only through the service, never silently; reopening does not recreate them.
- A contact linked to an open enquiry cannot be archived until the enquiry is resolved (the agreed archive rule). This reuses the protected-count approach from property ownership, maintained only by a database trigger.
- Completing an appraisal requires a lead source and the enquirer's completed contact details (landlord plan, "Records and history").

## Database security (RLS)

- **Enquiries:** visible to workspace-scoped members, or to named-branch members whose branches include the responsible branch. Inserts and updates must keep the branch within the actor's scope.
- **Appraisals, tasks and stage history:** visible when the enquiry is visible.
- **Lead sources and reasons:** readable by every member of the workspace; written only through the application by users with the settings permission.
- Every function we add pins its search path and uses the owner-run trigger pattern for protected counts, following the 2026-10-16 property security review.

## Permissions

| Permission                   | Granted to                                                                |
| ---------------------------- | ------------------------------------------------------------------------- |
| `enquiry.read`               | Every role, within branch scope                                           |
| `enquiry.create` / `.update` | Account Owner, Agency Admin, Branch Manager, Negotiator, Property Manager |
| `enquiry.reopen`             | Account Owner, Agency Admin, Branch Manager                               |
| `enquiry.settings.manage`    | Account Owner, Agency Admin (lead sources and reasons)                    |

## Interface

- **Landlord leads** in the navigation: a list with stage, landlord, address or postcode, lead source, branch, appraisal date, next action and due date (overdue marked), with filters for stage, branch and assigned staff. Lost and postponed are hidden by default behind **Include lost and postponed**.
- **Quick landlord lead** form: name, phone or email, address or postcode, lead source, branch, and an optional first next action. Saves in one step. A visible "incomplete" flag appears if no next action is set.
- **Landlord-lead record** in the ADR-030 profile-sidebar layout: stage progress and the actions allowed at the current stage, next actions with due dates, appraisals (book, record outcome), details, and stage history. Booking an appraisal opens a short review of duplicate contact and property matches before the real records are created or linked.
- **Overview** gains a "Needs attention" area: new landlord leads awaiting action, today's appraisals, and overdue and upcoming next actions for the signed-in user.
- **Settings:** a small page to edit lead sources and outcome reasons (add, rename, reorder, hide).
- Light and dark themes, phone, tablet and desktop.

## Delivery stages

1. **5A — database and security:** schema, migration, starter lists, RLS, permissions and disposable-database isolation tests; owner approval to apply to shared Supabase.
2. **5B — services:** create, update, stage changes with history, appraisals, next actions, conversion to real contact and property, reopening, settings lists, and application tests.
3. **5C — interface:** list, quick enquiry, record page, Overview panel, settings page, and browser checks.
4. **Checkpoint:** independent security review (a separate Opus agent, as for Chunk 4), full relevant checks, documentation, demo data, and a short handover.

## Validation plan

- **Unit:** stage rules and allowed transitions, required-field rules per stage, overdue calculation in UK time, contact-detail validation.
- **Disposable database:** cross-workspace and cross-branch denial for every table; stage history safeguard (including temporary-table attempts); protected count for contacts with open enquiries; one scheduled appraisal at a time; lists readable by all members but writable only by the application.
- **Application:** conversion at appraisal booking with duplicate matches, rollback on partial failure, hidden-record handling, and rejection of malformed ids and forged identities at every server action.
- **Browser:** quick enquiry, stage progression, booking an appraisal with a duplicate warning, overdue display on Overview, settings lists, mobile and dark mode.

## Deliberate exclusions

Creating the instruction (Chunk 6), fees beyond a single proposed fee, e-signing, calendar or email sync, outbound reminders (email or SMS), a general to-do feature for any record, an enquiry notes timeline, enquiry branch transfer, web-form or portal lead capture, and CSV import.
