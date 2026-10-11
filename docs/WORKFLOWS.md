# Lettings workflows (high level)

This is the **shape** of the lifecycle, not a screen-by-screen spec and not legal advice. Branching rules (who must be referenced, when a deposit must be protected) are **unresolved** and must not be invented in code.

## 1. Set up the agency

Create organisation → branches → staff users and roles.

## 2. Instruct a property

Record landlord (person) → property → lettings instruction → listing (rent, available date, marketing copy, photos).

## 3. Market

Publish listing to portals through an **adapter**. Enquiries return via webhook or inbox and attach to the listing. **Providers unverified.**

## 4. Viewings and offers

Book viewings. Record feedback. Record offers and whether the landlord accepted. No implied legal status beyond what we store.

## 5. Application

Build an applicant household. Collect contacts and documents **as the product specifies later**.

## 6. Checks (placeholders)

Open `CheckOrder`s for referencing, affordability, AML/KYC/ID, Right to Rent, insurance as required **once rules exist**. Store provider status only. Do not display a fabricated “compliant” badge.

## 7. Agreement and sign

Draft tenancy record (parties, rent, dates). Send for e-signature via a provider adapter. Mark fully signed only when the provider confirms.

## 8. Move in

Activate tenancy. Collect/protect deposit **according to a future spec**. Hand over keys (operational note, not a legal event unless specified).

## 9. Manage

Rent demanded and receipted. Maintenance logged. Inspections booked. Compliance certificates dated. Renewals offered.

## 10. Move out

Check-out inspection. Deposit deductions **placeholder**. Tenancy ended. Listing may return to market.

```
Landlord + Property → Listing → Enquiry/Viewing/Offer
        → Application → CheckOrders → Tenancy
        → Occupancy (rent, works, inspections)
        → Check-out / deposit / end
```

## Sales (later)

Sales will fork after a shared property record (appraise → instruct → list → offer → complete). Do not design that workflow in lettings screens.

## Operational rules we will not guess

- Which applicants need which checks
- Insurance eligibility
- Deposit scheme choice and timelines
- Notice and eviction processes
- Cross-border UK regime differences
