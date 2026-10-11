# Modules

Modules are **product areas with code boundaries**, not separate deployed services.

Status: **planned**. None of these exist as application features yet except a visual login screen.

## Core (shared)

| Module | Responsibility |
| --- | --- |
| Organisation | Agency firm we sell to; billing account; settings |
| Branch | Offices under an organisation; staff home branch |
| Identity | Login, sessions, membership, roles |
| People / contacts | Landlords, tenants, applicants, solicitors, contractors — a person can wear several hats |
| Property | The physical unit (address, type, bedrooms) shared by lettings and later sales |
| Documents | Private files, who may view them, retention flags |
| Audit | Who did what, when, on which record |
| Jobs | Outbound/inbound async work |
| Notifications | In-app (and later email/SMS) — **proposed** |

## Lettings

| Module | Responsibility |
| --- | --- |
| Instruction / marketing | Lettings instruction, advertised rent, particulars |
| Portals | Publish/unpublish to Rightmove, Zoopla, etc. via adapters |
| Pipeline | Enquiries, viewings, offers, negotiation notes |
| Referencing | Order, status, artefacts from a **provider** — no invented pass/fail rules |
| Affordability | Store outcomes and documents from specified checks |
| AML / KYC / ID | Provider orders and status only until rules are specified |
| Right to Rent | Status and evidence placeholders until rules are specified |
| Insurance | Products such as rent guarantee — catalogue and status, not invented underwriting |
| Tenancy | Agreement records, occupants, start/end, e-sign envelope ids |
| Finance | Rent demands, receipts, allocations — **not** a full accounts package in PoC |
| Maintenance | Works orders, contractors, access notes |
| Inspections | Inventory, mid-term, check-out appointments and reports |
| Compliance | Certificates and dates (gas, EICR, EPC, etc.) as records, not a legal engine |
| Deposits / move-out | Deposit account references, deductions **placeholders** until scheme rules exist |
| Renewals | Offer to renew, terms — workflow later |

## Sales (later)

Empty on purpose. Expected later: appraisals, instructions to sell, listings, viewings, offers, memorandum of sale, chain. Must reuse **core people and property**. Must **not** import lettings tenancy internals; shared needs get promoted to core.

## Presentation

shadcn-based UI shells: staff app first. Landlord/tenant portals are **proposed** later and must use the same permission model (narrower).

## What a module may depend on

- Lettings → core
- Sales → core
- UI → the module it belongs to + `components/ui`
- Not: lettings ↔ sales, or Prisma inside React components
