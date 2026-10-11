# Permissions

Nothing below is implemented. Login does not create a session.

## Isolation model (confirmed)

1. **Organisation** (agency) is the hard tenancy boundary. All staff queries filter by it.
2. **Branch** is a weaker scope. **Proposed:** branch-restricted roles only see properties and people linked to their branches. Company admins see the whole organisation.
3. **Resource** — even inside an organisation, users only act if their role allows that action on that type (and branch, if restricted).

IDOR (changing a UUID in the URL) must fail for the other organisation. We will test this once data access exists.

## Roles (proposed)

Names can change. Do not add dozens of roles in the PoC.

| Role               | Intent                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `platform_admin`   | Zayto operator. Not an agency user. Break-glass only.                                         |
| `org_admin`        | Agency owner/manager. Users, branches, billing, all records in the org.                       |
| `branch_manager`   | Same as negotiator + property manager for one branch, plus local user invites **unresolved**. |
| `negotiator`       | Listings, enquiries, viewings, offers, applications (lettings pipeline).                      |
| `property_manager` | Tenancies, inspections, maintenance, compliance.                                              |
| `accounts`         | Rent, invoices, receipts, deposits (when finance exists).                                     |
| `read_only`        | Reporting / training.                                                                         |

Landlord and tenant **portal** roles are **proposed for later** and must be separate from staff roles (much narrower: their properties/tenancies only).

## Permission style (proposed)

Store **roles**, not hundreds of flags per user. Map `role + action + resource type` in code (a single matrix). Resource-level checks (this property’s branch, this document’s application) in application services.

Example actions: `property.read`, `property.write`, `application.submit_checks`, `finance.read`, `org.settings.write`.

**Unresolved:** whether a user may hold multiple roles; **proposed** yes (negotiator + property manager).

## Server vs client (confirmed)

Menus hide what you cannot do. The **server** still rejects unauthorised actions. Never trust a client-supplied `organisationId`; take it from the session membership.

## Audit (confirmed as a requirement)

Permission changes, logins, data exports, document views of ID/financial files, and money events should write audit rows once those features exist.

## GDPR / UK GDPR (requirement; legal detail unresolved)

- Staff access is on a need-to-know basis (least privilege).
- Applicants/tenants/landlords have rights of access and erasure; erasure must respect legal retention (e.g. some records cannot vanish immediately). Exact retention periods are **unresolved**.
- Do not use production-like personal data in local mocks.
