# Contact merge (Chunk 3C)

**Status:** Deferred by the owner on 2026-10-15 as disproportionate to its current value. The design below records the owner's decisions so it can be resumed later; it is not approved for implementation. Revisit when duplicate contacts become a real operational problem, for example before data import or pilot onboarding.

## Outcome

A Branch Manager or higher can merge two confirmed duplicate contacts of the same kind after reviewing them side by side and choosing which conflicting values survive. Nothing useful is lost, the duplicate stays traceable as merged, the action is audited, and it cannot be undone.

## Owner decisions (2026-10-15)

- Merges cannot be undone; a careful preview and confirmation step protects against mistakes.
- The merging manager must be able to act in **every** active branch of **both** records. Otherwise an Account Owner or Agency Admin (workspace scope) performs the merge.
- All email addresses and telephone numbers from both records are kept, with exact repeats removed; the manager chooses the preferred one of each kind.
- An archived duplicate may be merged into an active survivor. The survivor must be active.

## User journey

1. On a contact record, a manager chooses **Merge duplicate…** (only shown with `contact.merge`).
2. They pick the other record: likely duplicates (existing explainable candidates) are listed first, with search for anything else. Only records of the same kind are offered.
3. A side-by-side review shows both records. The manager chooses which record **stays** (default: the older record). For each field that differs, they choose a side; matching values need no decision.
4. A final confirmation states what will happen and that it cannot be undone.
5. The survivor opens with a confirmation message and a **Merged records** entry linking to the duplicate.

## What the merge does

All writes happen in one transaction.

| Data                                       | Result                                                                                                                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Names and identity fields                  | Chosen side per differing field. Organisation identity follows the existing sensitive-change rule (`contact.sensitive.manage`, which every merging role has).                                                         |
| Communication preferences                  | Chosen side as one group (preferred channel and do-not-use flags), so the existing preferred/restricted consistency rule still holds.                                                                                 |
| Email and telephone                        | Union of both, de-duplicated by kind and normalised value; the manager picks the preferred entry of each kind. The duplicate's rows are copied, not moved.                                                            |
| Addresses                                  | Chosen side per address kind (individual, registered, correspondence).                                                                                                                                                |
| Branches                                   | The survivor gains non-primary links to the duplicate's active branches. The survivor's primary branch is unchanged.                                                                                                  |
| Organisation-person links                  | The duplicate's active links are re-created on the survivor (skipping ones that already exist) and ended on the duplicate. If both had a main contact for the same organisation, the survivor's existing one is kept. |
| Notes                                      | Left untouched on the duplicate. The survivor's timeline also shows notes from records merged into it, marked **From merged record PER-…**.                                                                           |
| Contacts merged earlier into the duplicate | Re-pointed to the survivor so every merged record is one step from its survivor.                                                                                                                                      |
| The duplicate                              | Status `merged`, `merged_into_contact_id` = survivor, `archived_at` set. Its own details, contact methods, addresses, and branch links are otherwise left as they were for traceability.                              |

## Safety rules

- Both records must be in the same workspace, of the same kind, visible to the actor, and different records.
- The actor needs `contact.merge` and access to every active branch of both records.
- The preview carries a server-computed fingerprint of both records (fields, contact methods, addresses, links). Confirmation locks both rows (`SELECT … FOR UPDATE`), recomputes the fingerprint, and refuses the merge if anything changed.
- Audit action `contact.merge` on the survivor, with the duplicate ID, which side each differing field came from, and counts of copied contact methods and re-created links. No personal values.
- Denied and failed attempts are audited, as elsewhere.

## Database change (small migration)

No new tables. One trigger makes a merge final at the database level: a contact with status `merged` cannot change status or `merged_into_contact_id`, except that `merged_into_contact_id` may be re-pointed to another contact during a later merge of its survivor. This needs the usual approval before it is applied to shared Supabase.

## Interface

- **Merge duplicate…** on the contact record header, for managers only.
- A full-screen dialog on mobile and a wide dialog on desktop for the side-by-side review, with one decision row per differing field, and a single **Merge records** action after confirmation.
- A banner on a merged record: **Merged into [name, reference]** with a link. Merged records stay out of normal lists and search unless **Include merged** is chosen.
- Light and dark themes, phone, tablet, and desktop.

## Validation plan

- **Unit:** field-difference detection, contact-method de-duplication, fingerprint stability.
- **Disposable database:** permission and branch-coverage denials; cross-kind and cross-workspace refusal; stale fingerprint refusal; contact methods unioned without duplicates and one preferred per kind; addresses chosen per kind; branch links added; organisation links re-created and ended without breaking the one-main-contact rule; earlier merged records re-pointed; notes visible from the survivor with branch privacy intact; merged status final; audit without personal values.
- **Browser:** start a merge, review, confirm; merged banner; mobile and dark mode.

## Deliberate exclusions

Undo, merging a person with an organisation, bulk or automatic merging, and merge rules for properties, instructions, and other future modules (each later module must treat a merged contact as pointing to its survivor).
