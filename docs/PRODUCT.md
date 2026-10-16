# Product

Status key: **Confirmed** (we will build this), **Proposed** (sensible default, can change), **Unresolved** (needs a decision).

## Vision (confirmed)

Zayto is a **UK residential lettings and property management CRM** for letting agencies. It should cover the lettings lifecycle from instruction through occupancy, compliance, money, and move-out. **Residential sales** will be added later on the same organisations, people, and properties — not as a separate product in the first instance.

The original README described an “AI-powered tenant referencing platform”. Referencing remains **one capability**, not the whole product.

## Who it is for (confirmed)

Zayto serves several first-class user groups through one identity: agency staff, independent landlords, invited landlords, applicants, tenants, and guarantors. A person may act in several capacities across different workspaces and relationships without creating separate accounts.

Applicants, tenants, and guarantors have secure personal portal journeys rather than existing only as agency CRM records. Independent landlords can own a workspace, manage property, and purchase standalone services without an agency CRM subscription. Invited landlords see only information a managing agency explicitly shares.

## Proof of concept vs commercial product (confirmed)

We start with a **proof of concept** (thin vertical slice that looks and feels like the real product). The underlying shape — modules, organisation isolation, server-side permissions, audit — must still be suitable for a **secure commercial** system. We will not “add security later” to data that should never have been world-readable.

We will **not** implement every lifecycle area in the PoC. See `ROADMAP.md`.

## Lifecycle coverage (confirmed as product scope; not all in PoC)

- Agency and branch management
- Landlords, tenants, applicants, and other contacts
- Property records and marketing
- Property portal publishing
- Landlord leads, applicant property enquiries, viewings, and offers
- Tenant referencing and affordability checks
- AML, KYC, and identity verification
- Right to Rent
- Rent guarantee and other insurance products
- Tenancy agreements and electronic signatures
- Rent collection and financial management
- Maintenance and contractor management
- Inspections, renewals, and compliance
- Check-out, deposits, and move-out

**Do not invent** detailed rules for referencing, insurance, AML, KYC, Right to Rent, or tenancy deposit schemes. Product and legal specialists will specify those separately. Until then, model **placeholders** (status, provider, documents) only.

## Principles (confirmed)

1. **Workspace isolation** — one agency or landlord workspace must never see another's data.
2. **Truth in the database** — the CRM is the system of record; portals and providers are edges.
3. **Lettings first** — sales must not distort the first data model, but people and properties stay shared.
4. **Honest software** — do not display a “pass” or “filed” state unless a real provider or user action happened.
5. **UK context** — currency GBP, dates and addresses as used in England (and later devolved differences if specified). Scotland/Wales/NI variations are **unresolved**.
6. **Independent modules** — CRM, pre-tenancy, property management, accounting, referencing, AML, Right to Rent, and other modules can be subscribed to and used without buying unrelated modules.
7. **One identity, explicit contexts** — business membership and personal participation are separate; access follows the current workspace, relationship, resource, and field.
8. **Commercial independence** — Zayto does not assume access to Blinc software, data, documents, supplier credentials, or commercial arrangements.
9. **Data portability** — established customers must be able to bring appropriate legacy CRM data into Zayto and later export their Zayto data in documented, usable formats. Core models must preserve provenance and history without becoming shaped around one supplier.

## CRM terminology (confirmed)

- A **landlord lead** is a potential instruction concerning a property. The landlord-lead journey is appraisal through instruction won, lost, or postponed.
- An **applicant** is a person or household looking to rent. They are not called a tenant until a tenancy exists.
- A **property enquiry** is an applicant's interest in one advertised listing. One applicant may enquire about several listings, and one listing may receive enquiries from many applicants.
- Viewings, offers, applications, and tenancies remain distinct connected records. Progression carries reviewed information forward without overwriting the earlier history.
- The current proof-of-concept feature was originally labelled **Enquiries** but is specifically the landlord-lead workflow. Its staff-facing rename remains an implementation task.

## Commercial model (confirmed shape; details unresolved)

Module access is controlled per workspace and may support free service, subscriptions, versioned plans, trials, add-ons, limits, allowances, and pay-per-use services. Specific tiers, pricing, trial periods, and free allowances are not agreed.

Every action combines workspace entitlement, user permission, and resource/field access. External participants do not consume staff seats by default.

## Native referencing and AML (confirmed)

Referencing and AML are Zayto products, not links to somebody else's portal. Zayto owns the case workflow, user experience, consent, progress, audit, review, and commercial transaction. Approved external specialists may provide data and verification services through adapters. Zayto will not invent statutory, legal, underwriting, or pass/fail rules.

## Out of scope for now (confirmed)

- Building native mobile apps
- Fully automated underwriting without a named provider
- Invented AI features that are not specified
- Treating an authenticated identity as authorised without workspace, permission, entitlement, and resource checks
