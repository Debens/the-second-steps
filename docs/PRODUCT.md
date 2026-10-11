# Product

Status key: **Confirmed** (we will build this), **Proposed** (sensible default, can change), **Unresolved** (needs a decision).

## Vision (confirmed)

Zayto is a **UK residential lettings and property management CRM** for letting agencies. It should cover the lettings lifecycle from instruction through occupancy, compliance, money, and move-out. **Residential sales** will be added later on the same organisations, people, and properties — not as a separate product in the first instance.

The original README described an “AI-powered tenant referencing platform”. Referencing remains **one capability**, not the whole product.

## Who it is for (confirmed)

Primary users: **agency staff** (negotiators, property managers, accounts, branch and company admins).

Later, **landlord** and **tenant/applicant** portals may be needed. That is **proposed**, not in the proof of concept.

## Proof of concept vs commercial product (confirmed)

We start with a **proof of concept** (thin vertical slice that looks and feels like the real product). The underlying shape — modules, organisation isolation, server-side permissions, audit — must still be suitable for a **secure commercial** system. We will not “add security later” to data that should never have been world-readable.

We will **not** implement every lifecycle area in the PoC. See `ROADMAP.md`.

## Lifecycle coverage (confirmed as product scope; not all in PoC)

- Agency and branch management
- Landlords, tenants, applicants, and other contacts
- Property records and marketing
- Property portal publishing
- Enquiries, viewings, and offers
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

1. **Agency isolation** — one organisation must never see another’s data.
2. **Truth in the database** — the CRM is the system of record; portals and providers are edges.
3. **Lettings first** — sales must not distort the first data model, but people and properties stay shared.
4. **Honest software** — do not display a “pass” or “filed” state unless a real provider or user action happened.
5. **UK context** — currency GBP, dates and addresses as used in England (and later devolved differences if specified). Scotland/Wales/NI variations are **unresolved**.

## Out of scope for now (confirmed)

- Building native mobile apps
- Fully automated underwriting without a named provider
- Invented AI features that are not specified
- Migrating or rewriting the existing login page until we add real authentication
