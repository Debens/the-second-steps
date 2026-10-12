# Modules

Modules are independently usable commercial product areas with code and data-ownership boundaries. They initially run in one modular monolith, not separate services. Except for the existing application shell and authentication sandbox, these product modules are not implemented.

## Core platform

Core capabilities exist for every workspace but do not imply entitlement to every product module.

| Capability          | Responsibility                                                                         |
| ------------------- | -------------------------------------------------------------------------------------- |
| Identity            | One login, sessions, recovery, MFA state                                               |
| Workspace           | Agency, landlord, and internal tenant boundaries and ownership                         |
| Access              | Memberships, participations, roles, branches, resource/field grants                    |
| Personal account    | User-controlled profile and cross-workspace personal portal                            |
| People / contacts   | Workspace-specific operational records and relationships                               |
| Property            | Neutral physical property and address concepts shared by entitled modules              |
| Commercial          | Product catalogue, entitlements, subscriptions, trials, add-ons, service orders, usage |
| Documents           | Private classified files, grants, retention, and short-lived delivery                  |
| Audit               | Security and business events                                                           |
| Jobs / integrations | Durable work, outbox, idempotency, provider attempts                                   |
| Notifications       | In-app and later approved email/SMS delivery                                           |

## Independently entitled modules

| Module               | Responsibility                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------- |
| CRM                  | Instructions, listings, enquiries, viewings, offers, and agency pipeline                  |
| Pre-tenancy          | Applications, applicant households, tasks, agreements, and move-in                        |
| Referencing          | Native Zayto reference cases, evidence, reviews, outcomes, and provider orchestration     |
| AML / KYC / identity | Native cases, review, consent, evidence, and approved specialist data adapters            |
| Right to Rent        | Native workflow and evidence only when written rules and approved services exist          |
| Property management  | Tenancies, maintenance, inspections, renewals, and operational compliance records         |
| Accounting           | Ledger, charges, receipts, allocations, reconciliation; requires separate design approval |
| Insurance            | Product and transaction workflow without invented underwriting                            |
| Portals / publishing | Provider-independent property publication and inbound events                              |
| Sales                | Later module reusing neutral people/property concepts without lettings dependencies       |

A workspace may subscribe to one module without buying an unrelated module. Referencing or pre-tenancy must work without CRM; an independent landlord workspace must be able to buy standalone services.

## First-class personal experiences

The personal portal composes capabilities from entitled modules:

- Applicant: enquiries, viewings, offers, applications, checks, evidence, communications, signing, and move-in.
- Tenant: current/history, agreements and documents, permitted financial views, maintenance, communications, renewals, notices, move-out, and deposit information.
- Guarantor: their checks, financial evidence, obligations, and relevant signing.
- Invited landlord: only explicitly shared management information and actions.

These users are participants in named resources, not broad members of an agency workspace. Joint participation never implies access to another person's confidential evidence or results.

## Dependency rules

- Presentation calls application services; it does not call Prisma or provider SDKs.
- Optional modules depend on narrow core contracts.
- Optional modules do not import another optional module's internals or require its entitlement.
- Cross-module actions use an application contract or recorded event, not direct table manipulation.
- External suppliers sit behind capability interfaces and do not define Zayto's domain model.
- Sales and lettings may share core people/property concepts but not one another's internals.

## Commercial access

Module visibility and use require three server-side checks: workspace entitlement, user permission, and specific resource/field access. Plan names, prices, free allowances, trials, and limits remain unresolved.
