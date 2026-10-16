# Enquiry workflows and fluidity

**Status:** Terminology, record boundaries, and recommended navigation direction approved by the owner on 2026-10-16 (Gate 1). Applicant identity, household, operational progression, communications, schema, and implementation remain proposal-stage approval gates.

## Why this review is needed

In everyday agency work, “an enquiry” can mean at least two different things:

1. A **landlord opportunity**: someone may want the agency to value, let, or manage a property.
2. An **applicant enquiry**: someone is looking for a home or is interested in a particular advertised property.

The implemented Chunk 5 feature is only the first kind. Its journey is landlord name and property → appraisal → instruction won/lost/postponed. The product roadmap also uses “enquiries” for applicants interested in listings. Calling both simply **Enquiries** would mix supply-side business development with demand-side applicant work, even though their stages, records and daily actions are different.

The immediate goal is therefore clarity, not more code: agree the language and the joined-up staff journey before extending either workflow.

## Recommended product language

| Concept                                      | Recommended staff-facing name | Meaning                                                                                           |
| -------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| A landlord considering the agency            | **Landlord lead**             | A potential instruction concerning one property. This is what Chunk 5 currently calls an enquiry. |
| A person or household looking to rent        | **Applicant**                 | The durable contact/household and their requirements. They may be interested in many properties.  |
| Interest in a particular advertised property | **Property enquiry**          | An event or active interest linking an applicant to one listing.                                  |
| Appointment to see a property                | **Viewing**                   | Its own scheduled record, linked to applicant, listing/property and staff.                        |
| Proposed terms                               | **Offer**                     | Its own negotiated record with history; it is not an application or tenancy.                      |
| Formal progression after an accepted offer   | **Application**               | A pre-tenancy case with its own participants, private information and tasks.                      |

“Prospective tenant” is accurate in conversation, but **Applicant** is recommended inside the CRM until a tenancy actually exists. A person becomes a tenant only through a tenancy; their earlier applicant history remains intact.

## Recommended navigation direction

### Now

Rename the current **Enquiries** navigation and page title to **Landlord leads**. This is the smallest honest correction and makes the existing workflow understandable without changing its database immediately.

### When applicant work is added

Use a **Lettings pipeline** (or shorter **Pipeline**) work area with distinct views:

- Landlord leads
- Applicants
- Property enquiries
- Viewings
- Offers
- Applications

This should be one coherent work area, not one table containing every record type. The Overview remains the cross-workflow place for “what needs attention today”. Direct Landlords, Properties and Contacts areas remain available for durable records.

Alternative options to review:

- **Separate top-level navigation items:** clearest at small scale, but the navigation will grow crowded as viewings, offers and applications arrive.
- **One mixed Enquiries inbox:** convenient for initial triage, but unsuitable as the main record list because landlord and applicant stages do not mean the same thing.
- **Recommended hybrid:** one Pipeline entry with separate type-specific views, plus a small mixed **New enquiries** triage inbox later if real inbound channels justify it.

## The record model in plain English

An enquiry should be treated as something that happened, not as the permanent identity of a person.

```text
Incoming contact
  ├─ landlord wants agency help
  │    → Landlord lead → Appraisal → Instruction
  │
  └─ renter wants a home
       → Applicant + Requirements
           → Property enquiry → Viewing → Offer → Application → Tenancy
```

Important boundaries:

- One contact may be a landlord, applicant and later tenant in different contexts. Do not duplicate their core person record merely because their role changes.
- One landlord may have several leads over time or for different properties.
- One applicant/household may enquire about several listings.
- One listing may receive enquiries from many applicants.
- Applicant requirements belong to the applicant/household; interest and progression for one listing belong to the property enquiry.
- A viewing, offer, application and tenancy remain separate records. Progression links them and preserves the earlier history rather than overwriting it.
- Sensitive application, referencing, identity, affordability and Right to Rent information must not leak back into a general enquiry or shared household view.

## Workflow A — landlord lead to instruction

The implemented foundation is broadly correct, but should be reviewed under the clearer name **Landlord lead**.

### 1. Capture in under a minute

Minimum: landlord name, telephone or email, property address/postcode, source and responsible branch. The form should search for possible existing contacts/properties as staff type, without forcing a full contact or property record too early.

Outcome: a new lead with a responsible person and next action, or an immediately visible warning that the next action is missing.

### 2. Qualify

Staff confirm what the landlord needs, basic timing, whether the property is already let/occupied, and whether an appraisal is appropriate. Exact qualification questions remain an owner decision; compliance or ownership checks must not be invented here.

Possible outcomes:

- Book appraisal
- Continue follow-up
- Postpone with a follow-up date
- Mark lost with reason

### 3. Appraise

Booking creates or links the real landlord and property records after duplicate review. Staff see the appointment in their work queue, record attendance and capture the rental/service recommendation.

### 4. Follow up and decide

The appraisal outcome should lead directly to the next sensible action: follow up, revise recommendation, postpone, record lost, or mark instruction won. The current generic “Record outcome” control should eventually become stage-specific wording.

### 5. Create the instruction

Winning must start a reviewed instruction flow, not silently manufacture a complete instruction. Established landlord, property, owners, appraisal recommendation and lead source should carry forward without retyping. Commercial terms are reviewed once before saving.

## Workflow B — applicant need to tenancy application

This is not implemented and needs its own approved design and security review.

### 1. Capture or identify the applicant

An applicant may arrive from a portal, agency website, phone, email or walk-in. No integration should be assumed until available. Manual capture should allow:

- person or household name
- at least one contact method
- source and responsible branch/team
- property of interest, if there is one
- brief requirements when the enquiry is general
- next action/owner

The flow should search existing contacts first. The owner must decide whether a lightweight applicant record is created immediately or only once staff have made contact; the recommendation is a lightweight applicant/contact record immediately because applicants commonly enquire about several properties and repeated duplicate leads are otherwise hard to join.

### 2. Triage the need

There are two valid routes:

- **Property-specific:** link the applicant to the advertised listing and record the property enquiry.
- **General search:** capture reusable requirements, then match suitable listings later.

Suggested non-sensitive requirements for later approval include area, rent range, bedrooms, intended move date, household size and pets. Employment, income, immigration status, identity evidence and other sensitive/regulated details do not belong in quick enquiry capture without a separately approved need and workflow.

### 3. Contact and qualify

Staff record whether contact was attempted/made and the next action. The system should make unanswered leads, overdue callbacks and applicants without a next step visible. Agencies may need configurable closure reasons such as duplicate, unsuitable, no response, property unavailable or no longer looking; the exact list is unresolved.

### 4. Arrange a viewing

From the property enquiry, staff should be able to book a viewing without re-entering applicant or property information. Availability, assigned staff, attendees and appointment status belong to the viewing. Calendar sync and automated reminders remain later integrations.

### 5. Record viewing outcome

Immediately after the appointment, the work queue should ask for attendance/feedback and the next step:

- interested — follow up or invite offer
- another viewing requested
- not interested — reason/feedback
- did not attend — follow-up decision
- property/landlord declined progression, if applicable

Feedback visible to landlords is a future sharing decision; internal notes must not automatically become landlord-visible.

### 6. Offer

An offer records proposed rent, move date, conditions, household and status history. Staff can compare offers for the listing, but current UK rental-bidding rules and the exact landlord decision workflow require current legal/product review before implementation.

### 7. Application handoff

An accepted offer starts a separate application. Applicant and household members are reviewed, each private participant is invited appropriately, and agreed property/offer information carries forward. Referencing, Right to Rent, deposits, signing and affordability stay behind their own approved workflows.

## Fluidity principles for both journeys

1. **Capture once, enrich later.** Quick capture asks only what is needed to avoid losing the lead.
2. **Search before creating.** Show explainable contact/property/applicant duplicates at the moment a durable record would be created.
3. **Keep the user in context.** Booking, follow-up and outcome actions start from the current lead or applicant; staff should not hunt through separate modules.
4. **One obvious primary action.** The record’s main button reflects its current stage, with secondary actions grouped rather than scattered.
5. **Review once before consequential saves.** Related edits use one coherent form and one save.
6. **Carry data forward visibly.** Pre-fill later records from confirmed earlier information, while showing staff what will be created or linked.
7. **Always answer “what next?”** Every open operational record has an owner and next action, or is visibly incomplete.
8. **Use the Overview as a work queue.** Today’s appointments, overdue callbacks and untouched new enquiries should link directly to the action needed.
9. **Preserve history.** Conversion never destroys the lead, enquiry, viewing or offer that explains how the later record arose.
10. **Design for keyboard and phone use.** Phone-call capture must be fast on desktop; staff at appointments must be able to update outcomes on mobile.
11. **Respect scope and privacy by default.** Branch visibility, participant privacy and landlord-sharing decisions are explicit at every handoff.
12. **Avoid false automation.** Do not display messages sent, portal leads received or appointments synchronised unless a real integration performed them.

## Suggested daily staff experience

### Overview

The signed-in staff member sees a prioritised list rather than disconnected totals:

1. New unassigned/unactioned enquiries
2. Overdue callbacks and follow-ups
3. Today’s appraisals and viewings
4. Outcomes missing after appointments
5. Offers awaiting action
6. Upcoming tasks

Each item opens at the decision/action, not merely the top of a long record page.

### Fast universal capture

A future **New** action may offer:

- Landlord lead
- Applicant/property enquiry
- Contact
- Property

The first question routes the user to the correct short form. This is preferable to one large “new enquiry” form with conditional fields for unrelated workflows.

### Record header

Every workflow record should show, without scrolling:

- who and what it concerns
- current stage/status
- responsible branch and staff member
- next action and due date
- one primary progression action

## Decisions needed from the owner

These should be answered in order; later choices depend on the earlier ones.

### Gate 1 — terminology and navigation

Approved on 2026-10-16:

1. **Landlord leads** is the name of the current feature, rather than generic Enquiries.
2. **Applicant** describes a person/household looking to rent; **Property enquiry** describes their interest in one listing.
3. The eventual navigation direction is the recommended Pipeline area with separate views, not one mixed record table.

### Gate 2 — applicant identity and household

4. Decide when a real contact/applicant record is created: immediately at capture (recommended) or after successful contact.
5. Define the minimum non-sensitive applicant requirements needed for useful matching.
6. Decide the first household model: one lead applicant plus named other adults/children, or individual records for all adults from the start. Private-data boundaries must be designed before implementation.

### Gate 3 — operational progression

7. Agree the applicant/property-enquiry statuses and closure reasons.
8. Agree how staff assignment works: one applicant owner, one owner per property enquiry, or a shared branch queue with optional ownership.
9. Agree the viewing statuses, required outcome and follow-up behaviour.
10. Agree the minimum offer fields and who records/approves landlord decisions.

### Gate 4 — communications and external intake

11. Decide which communications must be recorded manually in the first slice.
12. Only after provider access is known, decide how portal/website enquiries enter Zayto and how duplicate inbound events are reconciled.
13. Decide which updates may later be shared with applicants or landlords; internal notes remain private by default.

## Proposed delivery plan

### Stage 0 — owner workshop and journey map

- Resolve Gates 1–3 using a few realistic fictional scenarios.
- Draw the happy path and important exceptions for landlord and applicant work.
- Confirm terminology with two or three typical agency staff roles if possible.
- Update `PRODUCT.md`, `WORKFLOWS.md`, `MODULES.md`, `ROADMAP.md` and the decision log before implementation.

**Exit:** one glossary, one navigation map, and approved stage diagrams. No code.

### Stage 1 — low-cost interaction prototype

- Prototype Overview, Pipeline landing, landlord lead, applicant, property enquiry and viewing screens using fictional data.
- Test desktop call capture, mobile appointment outcome, keyboard flow, light/dark themes and common empty/error states.
- Measure clicks/re-entry for the core journeys rather than judging only appearance.

**Exit:** owner-approved screen flow and terminology; still no database migration.

### Stage 2 — clarify the existing landlord workflow

- Apply the approved staff-facing rename and stage-specific language.
- Improve progression actions and instruction handoff where the prototype shows friction.
- Keep the existing database table names temporarily if a rename adds risk without user value; record any technical naming debt explicitly.

**Exit:** the current feature is unambiguously a landlord-lead workflow.

### Stage 3 — applicant and requirements foundation

- Design applicant/household, reusable requirements and property-enquiry records.
- Define branch scope, staff permissions, participant boundaries, audit and retention before migration.
- Add database/security tests and obtain approval before applying any shared migration.

**Exit:** secure applicant and property-interest records, without pretending viewings/offers exist.

### Stage 4 — applicant intake and work queue

- Add quick applicant/property-enquiry capture, duplicate handling, requirements and next actions.
- Add Applicant and Property enquiry views plus Overview attention items.
- Validate with realistic fictional volumes and repeat enquiries across listings.

### Stage 5 — viewings

- Add scheduling, rescheduling, cancellation, attendance, feedback and required follow-up.
- Start with an internal calendar/list; external calendar sync and automated reminders stay deferred.

### Stage 6 — offers and application handoff

- Add offers with append-preserving status/term history and clear landlord decision capture.
- Create an application only from an accepted offer, carrying forward reviewed data.
- Stop before regulated/private processes until their own designs are approved.

### Stage 7 — real inbound communications and optimisation

- Add portal, website, email, SMS or calendar adapters only when access, cost, consent, retry and reconciliation behaviour are approved.
- Use observed agency work to refine defaults, bulk actions, saved views and reporting.

## Validation approach

- Walk through realistic scenarios before schema design: new landlord, returning landlord/new property, general applicant, one applicant/many listings, joint applicants, repeat enquiry, no response, no-show, rejected and accepted offers.
- Test that staff can always identify the record, owner, stage and next action.
- Test that conversion carries data forward without duplicate people/properties or lost history.
- Prove cross-workspace, cross-branch and participant privacy at each new database stage.
- Use isolated browser-write fixtures before claiming the full workflow works end to end; shared demo data should not accumulate test records.
- Review current official UK guidance before implementing offer/rental-bidding behaviour or any regulated/private applicant step.

## Explicitly outside this planning decision

Detailed referencing, affordability, AML/KYC, Right to Rent, insurance, deposits, tenancy-document rules, portal contracts, calendar integrations, automated communications, applicant scoring, discriminatory ranking, and AI decisions. Each needs separate approved product, legal, security and provider work.

## Recommended immediate next step

Apply the small staff-facing **Landlord leads** terminology change before or alongside the planned Chunk 5 security checkpoint. Then use fictional scenarios to resolve Gates 2 and 3 before designing applicant tables or screens. The security review should validate the existing landlord-lead implementation without treating its internal `Enquiry` names as the future applicant model.
