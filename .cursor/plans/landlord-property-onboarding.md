# Landlord and property onboarding

**Status:** Confirmed product requirements and approved data relationships. Chunk 1 planning is complete; exact Chunk 2 schema and security design must be reviewed before any CRM migration or application implementation. No CRM schema, migration, application code, document storage, or integration work is authorised by this document alone.

## Outcome and first release boundary

Build the first connected lettings workflow for independent English agencies with approximately one to three branches. Staff can capture a landlord lead quickly, develop it through appraisal, create reusable landlord and property records, record ownership and commercial instruction terms, and prepare the property for marketing without duplicating people or properties.

This milestone ends at **Ready to market**. Marketing content, photographs, floor plans, publishing, applicants, offers, pre-tenancy, active tenancies, management, and client accounting remain later slices. The first commercial proposition extends through tenancy creation, but it will be delivered over several reviewed milestones.

## Confirmed working conventions

- Deliver this as a multi-session, multi-day build in small reviewable chunks.
- End each chunk with a concise record of what is done, tested, unverified, and next.
- Use targeted checks while iterating; run broader relevant checks at security/data checkpoints and milestone completion.
- Do not start a new chunk when the remaining session capacity is unlikely to support implementation, checking, and a clean handover.
- Update this plan when owner feedback changes the workflow; do not silently preserve superseded requirements.
- Use fictional data until the security and release gates permit real customer data.

## Confirmed product decisions

### Records and history

- One workspace-specific person record can hold several roles over time, including landlord, applicant, tenant, guarantor, contractor, or staff relationship. Role-specific data and permissions remain separate.
- Organisations support limited companies, LLPs, partnerships, trusts, charities, and an `other` category.
- A person has structured title, first name, middle names, surname, and preferred name. First name and surname are initially required; the other fields are optional.
- An organisation has a legal name, optional trading name, applicable registration number, and optional VAT number. Registration details are required only where applicable to its type.
- Organisations can link several people, with an optional primary contact. A person may be linked to several organisations.
- People and organisations can hold several telephone numbers and email addresses, with preferred entries, a preferred communication channel, and channel-specific do-not-use restrictions. Marketing consent is separate.
- An individual landlord has one address. An organisation has a registered address and an optional different correspondence address.
- A completed individual landlord requires first name, surname, and at least one telephone number or email address. A completed organisation landlord requires its legal name plus either its own telephone/email or a linked primary person with contact details. Draft enquiries may remain temporarily incomplete but cannot progress past appraisal completion without these details.
- Do not collect date of birth, identity documents, bank details, tax information, or other sensitive data until an approved workflow requires it.
- Notes are separate dated and attributed timeline entries. Only Branch Manager or higher may edit or void them; the original, replacement, author, timestamp, and reason remain auditable. A voided note is hidden from the ordinary timeline, not erased.
- Lost, postponed, withdrawn, former, and archived history remains searchable and can be reactivated where valid. Ordinary users do not permanently delete core records.
- Records with an active enquiry, instruction, ownership relationship, property relationship, or tenancy cannot be archived until the relationship is resolved or transferred.
- Key records receive immutable, human-readable system references. Custom reference formats are deferred.

### Landlords and branches

- The same landlord is one shared workspace record even when properties are handled by different branches.
- Core contact information is shared. Properties, instructions, notes, tasks, and activities remain limited to authorised branches unless explicitly classified as agency-wide.
- Staff with access to a branch may view that branch's CRM records even if they are not the lead staff member.
- Authorised ordinary staff may update routine shared contact details; all changes are audited. Identity, ownership, organisation registration, merges, branch transfers, note corrections, and overrides require Branch Manager or higher.
- A landlord page shows **Properties with us**: the count of properties with any current let-only, rent-collection, or fully-managed instruction. Zayto will not attempt to maintain the landlord's wider portfolio.
- Duplicate checks use explainable signals. Exact email, telephone, organisation registration number, or full property-address matches are strong warnings; similar names and matching postcodes are weaker possible matches. Warnings do not merge automatically or prevent a justified creation.
- Branch Manager or higher can merge confirmed duplicates only after reviewing the records side by side and selecting which conflicting contact values survive. All non-conflicting relationships, notes, and history are preserved; the superseded record remains traceable as merged, and the action is audited.

### Properties and ownership

- Staff may begin with either the landlord or property and connect them during one guided onboarding process. Existing records can be selected and drafts can be resumed.
- A property is a permanent record. Repeat periods of agency service create separate instructions rather than replacing previous history.
- A property supports several individual or organisation owners. No ownership percentages are required.
- One current owner may be marked as the lead landlord contact for routine communication.
- Ownership relationships preserve known start and end dates. Former owners remain historical and are not presented as current.
- Structured manual addresses initially capture building/flat, street, locality, town/city, county, and postcode. Address lookup and UPRN capture are later integration work.
- Initial property characteristics include type; bedrooms, bathrooms, and reception rooms; optional floor area and unit; furnished status; parking/garage; outdoor space; selectable features; council-tax band when known; and general notes.
- Initial property types are detached, semi-detached, terraced, bungalow, flat/apartment, maisonette, room, and other. They are system-defined initially.
- Furnished status is Furnished, Part furnished, Unfurnished, or Flexible.
- Parking and outdoor-space details use standard selectable features plus free text for unusual details.
- Photographs and floor plans belong to the later marketing slice.

### Enquiries, appraisals, and work

- Quick enquiry capture requires landlord name, at least one contact method, property address or postcode, lead source, and responsible branch.
- Lead source uses a configurable workspace list. It is optional at first quick save and required before appraisal completion.
- The initial visible pipeline is **New enquiry → Appraisal booked → Appraisal completed → Instruction won / Lost / Postponed**.
- Lost and postponed outcomes record a reason; postponed work may include a future follow-up date. Both remain searchable and reopenable.
- An appraisal records date/time, assigned staff member, appointment status, expected monthly rent, recommended service type, proposed fee, notes, and outcome.
- Every open enquiry needs an owned next action and due date. A quick enquiry may be saved before this is supplied, but Zayto immediately flags it as incomplete.
- Follow-up reminders are initially in-app dashboard items. Email, SMS, and other outbound notifications wait for approved job and delivery infrastructure.

### Instructions and commercial terms

- A won opportunity creates a distinct instruction linked to the property, landlord parties, responsible branch, and lead staff member.
- The responsible branch is required. The lead staff member may be absent during initial capture but is required before Ready to market.
- Service types are Let only, Rent collection, and Fully managed.
- Rent stores amount and frequency, defaulting to per calendar month while supporting per week. Reporting conversions are calculated, not manually duplicated.
- Tenancy deposit and holding deposit are separate proposed amounts.
- The agency selects the available deposit arrangement for each property: standard deposit, nil-deposit alternative, or both. Each agency can set a default which authorised staff can change for a property, with history.
- Fees support percentage-of-rent and fixed amounts, optional additional setup/tenancy fees, and explicit VAT-inclusive or VAT-exclusive treatment.
- Changes to service or agreed fees create effective-dated versions and do not overwrite earlier terms.
- The instruction agreement initially records Prepared, Sent, and Signed, with a signed copy uploaded once approved private document storage exists. Native Zayto e-signing is a future candidate requiring a separate evidence, identity, integrity, and audit design.
- Signed instruction and verified ownership are required before On market. A Branch Manager or higher may record a reasoned, audited exception.
- Ownership-check status is Not started, In progress, Verified, or Failed, with checker, date, and method. Detailed ownership-check evidence and rules remain a later approved workflow.
- A branch transfer requires Branch Manager or higher and records the old branch, new branch, date, actor, and reason.

### Property journey

The approved visible journey is:

**Onboarding → Ready to market → On market → Let agreed → Let**

`Withdrawn` is available with a reason. Authorised staff can progress the ordinary journey and record Lost, Postponed, or Withdrawn. Any authorised staff member may also move a record backwards. Outcomes and backwards movements require a reason and are fully audited; they do not require manager approval.

The first milestone implements only Onboarding and Ready to market. On market is unlocked by the marketing slice after descriptions, media, required information, agreements, ownership checks, rent, deposits, availability, and other approved checks are complete. Missing requirements are shown; they are not bypassed silently.

### Navigation, records, and dashboard

- Main navigation has separate Landlords and Properties areas plus one shared Add landlord/property action.
- Landlord list defaults: name, individual/organisation, Properties with us, current pipeline stage, responsible branch, lead staff member, and next action.
- Property list defaults: address, landlord, branch, lead staff member, journey stage, service type, proposed rent, and next action.
- Lists use filters rather than excessive columns. Current records are the default; Include lost and Include archived are separate options.
- Landlord pages contain Overview, Properties, Enquiries/Appraisals, Activity, and Documents, plus People for organisations.
- Property pages contain Overview, Ownership, Instruction, Activity, and Documents. The summary exposes the current stage, landlord, branch, lead, service, and next action.
- One prominent workspace search eventually covers all record types and labels each result type. Phase 1 searches landlords, organisations, properties, and instructions by appropriate names, contact details, references, addresses, postcodes, and registration numbers. Results respect branch and record permissions.
- Initial dashboard content includes new enquiries awaiting action, today's appraisals, overdue/upcoming tasks, properties by journey stage, and recently updated records.
- Active-tenancy, pre-tenancy, ending, management, and other module metrics appear only after their underlying modules and permissions exist.

## Proposed data relationships for review

These are ownership boundaries, not approved Prisma table names. Every workspace-owned record carries `workspaceId`; relationships use workspace-aware foreign keys where practical; application authorisation and PostgreSQL RLS both enforce tenant and branch boundaries.

```text
Workspace
├── Person
│   ├── ContactPoint (email/telephone)
│   ├── PersonAddress (one current individual-landlord address in this slice)
│   ├── OrganisationPerson (roles and primary-contact marker)
│   └── PartyRole / module relationships
├── Organisation
│   ├── ContactPoint
│   ├── OrganisationAddress (registered/correspondence)
│   └── OrganisationPerson
├── Property
│   ├── PropertyOwnership ── Person or Organisation
│   ├── Instruction
│   └── PropertyFeature
├── LandlordOpportunity
│   ├── Appraisal
│   ├── Task / next action
│   └── OpportunityStageHistory
├── Instruction
│   ├── InstructionParty ── Person or Organisation
│   ├── InstructionTermsVersion
│   ├── OwnershipCheck
│   ├── AgreementStatusHistory
│   └── PropertyJourneyHistory
├── ActivityNote
├── ExternalSourceReference
└── AuditEvent (implemented shared facility)
```

Important boundaries:

- `Person` and `Organisation` are neutral contact records. Being a landlord is established by an opportunity, ownership, or instruction relationship, not a boolean on the contact.
- `PropertyOwnership` is distinct from `InstructionParty`: a legal owner, instructing contact, and lead communication contact are not assumed to be the same.
- `Property` is distinct from `Instruction`, and the future `Listing` remains distinct from both.
- Pipeline stage history, property journey history, term versions, ownership periods, branch transfers, merges, and sensitive corrections are append-preserving histories rather than mutable text fields alone.
- Notes and tasks have explicit branch/resource scope. Shared contact edits do not expose another branch's operational history.
- Documents use the future shared private-document capability and explicit classification; binary content is not placed in CRM tables.
- Search begins with indexed PostgreSQL fields. No separate search service is justified for this milestone.
- Import provenance attaches through stable external-source references without weakening canonical validation or tenant isolation.

## Proposed first module permissions

Roles remain bundles; server code checks named permissions plus workspace, branch, record, and field scope.

| Capability                                            | Account Owner / Agency Admin                     | Branch Manager                                                                            | Negotiator / Property Manager                                         | Read only                      |
| ----------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------ |
| View CRM records                                      | All authorised workspace records                 | Authorised branches                                                                       | Authorised branches                                                   | Authorised branches, no writes |
| Create routine records                                | Yes                                              | Yes                                                                                       | Yes                                                                   | No                             |
| Edit routine contacts and assigned workflow           | Yes                                              | Yes                                                                                       | Yes within branch scope                                               | No                             |
| Edit/void notes                                       | Yes                                              | Yes within branch scope                                                                   | No                                                                    | No                             |
| Merge duplicates                                      | Yes                                              | Yes within branch scope                                                                   | No                                                                    | No                             |
| Transfer branch                                       | Yes                                              | Yes between authorised branches                                                           | No                                                                    | No                             |
| Change sensitive identity/ownership/registration data | Yes                                              | Yes within branch scope                                                                   | No                                                                    | No                             |
| Record stage reversal/withdrawal                      | Yes                                              | Yes; ordinary assigned staff may submit a reasoned workflow change if separately approved | Assigned staff may progress forward and provide reasons where allowed | No                             |
| Record agreement/ownership-check exception            | Yes                                              | Yes within branch scope                                                                   | No                                                                    | No                             |
| Permanent erasure                                     | Separate controlled data-protection process only | No                                                                                        | No                                                                    | No                             |

Memberships with several operational roles receive the union of those roles' permissions while workspace, branch, record, and field scope continue to apply. `read_only` remains exclusive and cannot be combined with a writing role. Exact code-level permission names are an implementation detail to review with the Chunk 2 security design; they must express the approved actions above and must not change their meaning.

## Delivery chunks and approval gates

### Chunk 1 — requirements and data design (complete)

- Record confirmed workflow and field decisions.
- Review entity ownership, branch scope, histories, sensitive actions, and module boundaries.
- Resolve the product questions needed for the first implementation slice.
- **Gate passed:** the owner approved the proposed relationships, combined-role behaviour, minimum completed-contact requirements, audited staff stage corrections, ranked duplicate signals, and manager-controlled merge preview.

### Chunk 2 — people and organisations

- Approve exact schema, RLS policies, indexes, lifecycle states, audit actions, and permission names.
- The technical proposal is maintained in `.cursor/plans/people-and-organisations.md` and must pass its owner approval gate before implementation.
- **Checkpoint:** Chunk 2A database/security foundation is locally implemented, verified, and applied to shared development Supabase; application/UI work remains gated.
- Add people, organisations, contact points, addresses, organisation-person links, readable references, and focused migration provenance.
- Build create/view/edit/archive paths with targeted unit and database isolation tests.
- **Review:** responsive UI, light/dark themes, duplicate warnings, validation, permissions, cross-workspace and cross-branch denial.

### Chunk 3 — landlord relationships and duplicate resolution

- Add landlord-facing summaries, branch/resource visibility, notes/activity, duplicate candidates, and controlled merge behaviour.
- Do not infer matches or merge from one similar value.
- **Review:** history preservation, manager-only actions, search behaviour, and `Properties with us` semantics.

### Chunk 4 — properties and ownership

- Add structured addresses, characteristics, features, properties, current/historical ownership, lead landlord contact, and branch responsibility.
- **Review:** joint/organisation ownership, no percentage requirement, historical transitions, duplicate addresses, and isolation tests.

### Chunk 5 — enquiries, appraisals, and tasks

- Add quick enquiry, configurable lead sources, approved pipeline, appraisal details, next actions, reasons, and in-app dashboard work.
- **Review:** save-draft behaviour, overdue work, lost/postponed search, stage history, and role/branch scope.

### Chunk 6 — instructions and terms

- Add instruction periods, services, deposit offerings, rent, fee versions, agreement status, ownership-check status, branch transfers, and readiness rules.
- Private document storage is a separate approval gate before signed files are accepted.
- **Review:** historical terms, money precision, VAT presentation, exceptions, and audit coverage.

### Chunk 7 — guided onboarding

- Join existing/new landlord, organisation, property, ownership, enquiry, appraisal, and instruction records in one resumable task-led flow.
- **Review:** duplicate avoidance, partial drafts, clear completion state, mobile/tablet/desktop usability, and no re-entry of established data.

### Chunk 8 — lists, records, search, and dashboard

- Complete the approved list columns, record sections, filters, PostgreSQL-backed search, and useful dashboard summaries.
- **Review:** authorised result sets, archived/lost defaults, performance using representative fictional volumes, and navigation coherence.

### Chunk 9 — milestone hardening

- Run the proportionate full relevant gate for the connected milestone, including unit, database/RLS, permission, integration, browser, formatting, type, build, and migration checks required by the affected paths.
- Review accessibility, responsive themes, failure recovery, audit events, migration/export readiness, documentation, and the next marketing boundary.
- **Gate:** declare private-alpha readiness only when the documented checks pass; otherwise distinguish done, tested, and unverified.

CSV import follows stable manual workflows and must be ready before a pilot agency is onboarded. Start with one design partner, then two or three wider pilot agencies. No design partner has yet been selected; recruitment is a future commercial task, not a current development blocker.

## Next approval gate

The Chunk 2 database-design and migration gates have passed. Before contact application/UI work begins, present its narrow use cases, audit-writing boundary, and targeted test scope; keep later merge, notes, landlord, and property work behind their own chunk gates.

Later decisions, not blockers for Chunk 2: private document storage; native e-signing; detailed ownership checks; address finder; retention/erasure periods; marketing readiness and publishing; communications delivery; CSV mapping/import; and design-partner recruitment.
