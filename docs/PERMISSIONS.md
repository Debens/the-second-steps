# Permissions and access

Supabase login and server-verified sessions are implemented. Workspaces, memberships, participations, entitlements, MFA enforcement, roles, grants, and CRM data access are not implemented.

## Three-layer access model (confirmed)

Every protected server operation answers three separate questions:

1. **Entitlement** — may this workspace use the module, feature, allowance, or pay-per-use service?
2. **Permission** — may this identity perform this action through the current membership or participation?
3. **Resource and field access** — may they act on this particular record and see these fields?

Menus may reflect these answers, but the server enforces them. Never trust a client-supplied `workspaceId`, role, entitlement, branch, resource ID, or price.

## Workspace isolation (confirmed)

`Workspace` is the hard tenant boundary. Application code derives it from verified access and scopes every query and mutation. PostgreSQL RLS applies the same boundary from the first workspace-owned tables. Changing a UUID or workspace selector must never cross that boundary.

Branch scope is additional and weaker. Proposed options are whole-workspace access, one branch, several named branches, or an explicit resource exception.

## Business memberships (confirmed model)

Memberships are for people operating a workspace. Initial role names remain proposed:

| Role               | Intent                                                                       |
| ------------------ | ---------------------------------------------------------------------------- |
| `workspace_owner`  | Owns an agency or independent-landlord workspace and its commercial settings |
| `agency_admin`     | Agency users, branches, permissions, and all agency records                  |
| `branch_manager`   | Operational access within approved branches; invitation powers unresolved    |
| `negotiator`       | Listings, enquiries, viewings, offers, and applications                      |
| `property_manager` | Tenancies, inspections, maintenance, and compliance                          |
| `accounts`         | Financial records when accounting exists                                     |
| `read_only`        | Reporting or training within its granted scope                               |

A membership may hold several roles. The exact role matrix is unresolved until the first product slice.

`platform_admin` is not a customer membership role. Platform support has no automatic customer access; future just-in-time support access must be strongly authenticated, justified, time-limited, and audited.

## Participants (confirmed model)

Applicants, tenants, guarantors, and invited landlords use resource-specific participations and grants rather than broad agency membership.

- Applicant: their enquiries, viewings, applications, own submissions, requested checks, signing, and move-in tasks.
- Tenant: relevant current/historical tenancies, permitted documents and balances, their maintenance, communications, renewals, notices, and move-out tasks.
- Guarantor: only their requested checks, submissions, obligations, and relevant documents.
- Invited landlord: only properties, statements, documents, maintenance, or actions the managing workspace explicitly shares.

One identity may have many memberships and participations across workspaces. The personal portal aggregates only those authorised items and never reveals one relationship to another workspace.

## Privacy inside shared cases (confirmed)

Joint applicants and guarantors do not automatically see one another's income, employment, banking, identity evidence, provider reports, detailed outcomes, or internal notes. Shared progress and documents require an explicit classification or grant. Landlords receive only approved information or outcomes, not raw evidence by default.

## Commercial access (confirmed model)

External participants do not consume staff seats. Plans may limit operator seats, branches, properties, tenancies, active cases, storage, included transactions, or other usage. A workspace entitlement never gives every member permission, and a user permission never bypasses an absent entitlement.

## Invitations and claims (confirmed requirements)

Invitations are purpose-bound, single-use, expiring, revocable, and auditable. Tokens are stored safely. An existing identity claims the participation without creating another account; a new user creates one identity. Accounts are never merged from a name or similar email alone.

## Security and audit requirements

- Default deny at entitlement, permission, resource, and field levels.
- Required staff and workspace-owner MFA before customer data access.
- Log authentication, permission changes, invitations, failed access, exports, sensitive document views, and money events without logging the sensitive content.
- Test cross-workspace, cross-branch, cross-role, and cross-participant denial for every data path.
- Revoke active access when a relationship ends while preserving any continuing right to retain specific documents.

## Unresolved product and legal decisions

- Exact role matrix and whether customers can create roles
- Applicant/tenant MFA and step-up authentication rules
- What reference and AML progress or results each party may see
- What landlords may receive from checks
- Rights after applications or tenancies end
- Representatives, attorneys, carers, minors, and delegated access
- Identity recovery, duplicate accounts, and controlled merging
- Data retention, erasure, portability, and controller/processor responsibilities
