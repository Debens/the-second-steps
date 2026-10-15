# Properties and ownership (Chunk 4)

**Status:** Proposal awaiting owner approval. No migration, schema, or application code is authorised until the owner approves this design. Applying the migration to shared development Supabase is a separate approval step after an Opus security review.

## Outcome

Authorised staff can create a UK property in their branch, record its address and characteristics, record its current and former owners (people or organisations) with one lead landlord contact, add notes, and find it again. A contact's record shows the properties they own or have owned.

## Owner decisions (2026-10-15)

Confirmed earlier in `.cursor/plans/landlord-property-onboarding.md` and still binding: a property is a permanent record; several individual or organisation owners with no percentages; one current owner may be the lead landlord contact; ownership keeps known start and end dates and former owners are history; structured manual addresses; the agreed property types, furnished statuses, characteristics, and features; photos, listings, instructions, rent, and the property journey are later chunks.

Decided now:

- **Owners:** any staff member who can create a property may record its owners while creating it. Adding an owner to an existing property, ending an ownership, or changing the lead landlord contact needs Branch Manager or higher.
- **Owner visibility:** recording an owner gives that contact a non-primary branch link to the property's responsible branch, as for organisation-person links. Audited.
- **Notes:** properties get the same notes timeline as contacts in this chunk.
- **Navigation:** add a **Properties** area now. The **Landlords** area waits for Chunk 8, when its agreed columns can be filled.
- **Responsible branch:** a Branch Manager or higher may transfer a property between branches they manage, with a reason. The old branch, new branch, actor, date, and reason are kept.

## Data design

All tables are workspace-owned, use workspace-aware composite foreign keys, force RLS, and give the runtime role no DELETE.

### `Property` → `properties`

| Field                                                                                                  | Rule                                                                                                     |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `reference`                                                                                            | Immutable readable reference `PRP-XXXXXXXX`, unique per workspace                                        |
| `responsibleBranchId`                                                                                  | Required; changes only through a branch transfer                                                         |
| `status`                                                                                               | `active` or `archived` (archive is Branch Manager or higher)                                             |
| `addressBuilding`, `addressStreet`, `addressLocality`, `townCity`, `county`, `postcode`, `countryCode` | Building/flat optional; street, town/city and postcode required; postcode validated and normalised; `GB` |
| `normalizedAddressKey`                                                                                 | Derived from building, street, and postcode for duplicate warnings; never shown                          |
| `propertyType`                                                                                         | Detached, semi-detached, terraced, bungalow, flat/apartment, maisonette, room, other                     |
| `bedrooms`, `bathrooms`, `receptionRooms`                                                              | Optional whole numbers, 0–50                                                                             |
| `floorArea`, `floorAreaUnit`                                                                           | Optional; unit `sq_ft` or `sq_m`; both or neither                                                        |
| `furnishedStatus`                                                                                      | Optional: furnished, part furnished, unfurnished, flexible                                               |
| `features`                                                                                             | Codes from the system list below                                                                         |
| `parkingNotes`, `outdoorSpaceNotes`                                                                    | Optional free text for unusual details (≤ 500)                                                           |
| `councilTaxBand`                                                                                       | Optional England band A–H                                                                                |
| `generalNotes`                                                                                         | Optional internal summary (≤ 2,000); dated discussion belongs in the notes timeline                      |
| `createdByMembershipId`, `createdAt`, `updatedAt`, `archivedAt`                                        | Standard                                                                                                 |

### `PropertyOwnership` → `property_ownerships`

| Field                               | Rule                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `propertyId`, `contactId`           | Same-workspace keys; the contact may be a person or an organisation, not a merged record |
| `isLead`                            | At most one current lead per property (partial unique index)                             |
| `startedOn`, `endedOn`              | Optional known dates; `endedOn` on or after `startedOn`                                  |
| `endedAt`, `endReason`              | Set when an ownership ends; ended rows are never reopened or deleted                     |
| `createdByMembershipId`, timestamps | Standard                                                                                 |

One current ownership per property and contact (partial unique index). A trigger keeps ownership fields immutable apart from ending and the lead marker.

### `PropertyBranchTransfer` → `property_branch_transfers`

Append-only: `propertyId`, `fromBranchId`, `toBranchId`, `reason` (required, ≤ 500), actor, timestamp. Written in the same transaction as the branch change.

### Property notes

Same design as contact notes (`.cursor/plans/contact-notes.md`), in separate `property_notes` and `property_note_revisions` tables so the reviewed contact-notes rules stay unchanged. One difference: a property has one responsible branch, so property notes are visible to everyone who can see the property and there is no "share with all branches" option. After a transfer, the new branch sees the property's full history.

## Database security (RLS)

- **Properties:** visible to workspace-scoped members, or to named-branch members whose branches include the responsible branch. Inserts and updates must keep the responsible branch within the actor's scope.
- **Ownerships:** visible only when both the property and the owner contact are visible, so a hidden contact never appears through a property.
- **Transfers and property notes:** visible when the property is visible; notes and revisions follow the contact-notes rules otherwise.
- **Branch transfer:** the transfer also shares every current and former owner with the new branch, so the property's owner history stays complete and visible there.

## Permissions

| Permission                                      | Granted to                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| `property.read`                                 | Every role, within branch scope                                           |
| `property.create`                               | Account Owner, Agency Admin, Branch Manager, Negotiator, Property Manager |
| `property.update`                               | As create, plus Accounts                                                  |
| `property.archive`                              | Account Owner, Agency Admin, Branch Manager                               |
| `property.ownership.manage`                     | Account Owner, Agency Admin, Branch Manager                               |
| `property.branch.transfer`                      | Account Owner, Agency Admin, Branch Manager                               |
| `property.note.create` / `property.note.manage` | As the matching contact-note permissions                                  |

Contacts with a current ownership cannot be archived until the ownership is ended (agreed rule, enforced from this chunk).

## Duplicate warnings

The agreed rule: an exact match on building, street, and postcode is a **strong** warning; the same postcode and street is a **possible** match. Warnings explain the match, never block a justified creation, and only show properties the user can see.

## Selectable features (proposed starter list for approval)

System-defined, grouped for the form:

- **Outside space:** private garden, communal garden, balcony, terrace or roof terrace, patio
- **Parking:** off-street parking, allocated parking, garage, on-street parking, permit parking, electric vehicle charging
- **Building:** lift, concierge, bike storage, wheelchair accessible
- **Heating:** gas central heating, electric heating, underfloor heating
- **Interior:** en-suite, utility room, dishwasher, washing machine, fireplace

Letting policies (pets, smokers, students, and so on) are not property features and belong to the later marketing slice.

## Interface

- **Properties** list: address, lead landlord, type, bedrooms, responsible branch, and last updated, with search (address, postcode, reference, owner name) and filters. Columns for lead staff, journey stage, service, rent, and next action arrive with their chunks.
- **New property** page (two columns on wide screens): address with a live duplicate warning, details and features, responsible branch, and owners. Owners are chosen from existing contacts or added as a new person or organisation in place, with the duplicate-contact check, and one marked as lead.
- **Property record** in the ADR-030 profile-sidebar layout: the address as the title, reference, type, and key facts on the left; **Owners** (current, with former owners on request) and **Notes** in the working area; details and features in the 2xl rail. Managers see **Manage owners**, **Transfer branch**, and **Archive**.
- **Contact record:** a **Properties** section listing properties the contact owns or has owned.
- Light and dark themes, phone, tablet, and desktop.

## Delivery stages

1. **4A — database and security:** schema, migration, RLS, permissions, and disposable-database isolation tests; Opus review; owner approval to apply to shared Supabase.
2. **4B — services:** create, update, archive, transfer, ownership add/end/lead, duplicates, and notes, with application tests.
3. **4C — interface:** list, create, record, contact Properties section, and browser checks.
4. **Checkpoint:** full relevant checks, documentation, and a short handover.

## Validation plan

- **Unit:** address normalisation and validation, characteristics rules, feature codes, duplicate strength, lead rules.
- **Disposable database:** cross-workspace and cross-branch denial for properties, ownerships, transfers, and notes; hidden-contact ownership never shown; one current lead and one current ownership per contact; ended ownerships immutable; transfer shares owners; runtime cannot delete; audit without personal values.
- **Browser:** create with owners, duplicate warning, record page, manager actions, contact Properties section, mobile and dark mode.

## Deliberate exclusions

Address lookup and UPRN, photos and floor plans, listings and publishing, instructions and fees, rent, the property journey, compliance and licensing, ownership checks and evidence, the Landlords area, property merge, CSV import, and devolved-nation council-tax bands.
