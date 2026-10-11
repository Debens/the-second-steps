# Data model (proposed)

This is a **sketch for discussion**, not a Prisma schema and not a complete database. Do not create tables from this file until a PoC slice is agreed.

Every organisation-owned record is expected to include `organisationId`. That is how we isolate agencies.

IDs: **proposed** UUID primary keys.

## Core entities

```
Organisation 1──* Branch
Organisation 1──* Membership (User + Role + optional Branch)
Organisation 1──* Person
Person 1──* PersonRole  (landlord | tenant | applicant | contractor | other)
Organisation 1──* Property
Property *──* Person     (via PropertyParty: owner, occupier, etc.)
```

**Organisation** — the letting agency company (our customer).  
**Branch** — an office. Users may be limited to one or more branches (**unresolved** how strict).  
**User** — a login identity. Staff users belong to an organisation via membership.  
**Person** — a human (or later a company landlord). Do not create separate “landlord table” vs “tenant table” as the only model; use **roles on a person** so the same human can be a landlord in one relationship and a tenant in another.  
**Property** — address and physical facts. Lettings marketing and (later) sales listings hang off this.

## Lettings entities (proposed)

```
Property 1──* Listing (channel: lettings)
Listing 1──* Enquiry
Listing 1──* Viewing
Listing 1──* Offer
Property 1──* Application (applicant household applying to let)
Application 1──* ApplicationParty
Application 1──* CheckOrder   (referencing | AML | Right to Rent | insurance — type enum)
Application 0..1── Tenancy    (when offer accepted / agreement completed)
Tenancy 1──* TenancyParty
Tenancy 1──* RecurringCharge / Transaction   (finance — later)
Property 1──* ComplianceItem
Property 1──* WorkOrder
Tenancy 1──* Inspection
Tenancy 1──* DepositRecord   (placeholder)
```

**CheckOrder** stores provider, external id, status, and document links. It does **not** encode pass/fail policy.

**Listing** vs **Property**: a property is the house; a listing is a marketing campaign (rent, available date, portal ids).

## Documents and audit (proposed)

- `Document` — organisation, related record (polymorphic or explicit FKs per type), storage key, mime, createdBy, retention.
- `AuditEvent` — actor, organisation, action, entity type/id, metadata JSON (no secrets).

## Sales (not designed)

When sales starts, **do not** fork Property. Add `Listing` with channel `sales` or a `SalesInstruction` that points at Property. Details **unresolved**.

## What we are deliberately not doing yet

- Full chart of accounts
- Multi-currency
- Modelling every deposit scheme rule
- Event sourcing
- Separate database per agency (rejected for PoC; see `DECISIONS.md`)

## Referential integrity (proposed)

Foreign keys in PostgreSQL. Unique `(organisationId, …)` where business keys exist (e.g. portal listing id per org). Cascade deletes only for true owned children (e.g. listing photos), never for people or properties because of history.
