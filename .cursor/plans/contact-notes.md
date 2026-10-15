# Contact notes (Chunk 3B)

**Status:** Implemented. Design approved by the owner, security-reviewed, tested against the disposable database, migration applied to shared development Supabase on 2026-10-15 (RLS forced, `zayto_app` grants and absence of other grantees verified), and browser-checked on desktop and mobile in light and dark themes.

## Outcome

Authorised staff can record dated, attributed notes on a person or organisation contact, see them as a timeline, and keep branch-private information private. Branch Manager or higher can correct or void a note with a reason, and nothing is erased.

## Owner decisions (2026-10-15)

- Notes default to the writer's branch; the writer may tick **Share with all branches**.
- Only Branch Manager or higher may edit or void a note, within their branch scope. Authors cannot edit their own notes; they add a follow-up note instead.
- A note has an optional **When it happened** date and time, defaulting to now. The saved time is always recorded separately.
- No note types in this slice. Plain-text notes only.
- The timeline shows notes only. Automatic events such as contact created or person linked are a later follow-up.

## Data design

### `ContactNote` → `contact_notes`

| Field                                            | Shape                   | Rule                                                                          |
| ------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------- |
| `id`, `workspaceId`                              | UUIDs                   | Workspace-owned                                                               |
| `contactId`                                      | UUID                    | Same-workspace composite foreign key                                          |
| `branchId`                                       | UUID                    | Owning branch; same-workspace composite foreign key; immutable                |
| `visibility`                                     | enum `BRANCH`, `AGENCY` | `AGENCY` is visible wherever the contact is visible                           |
| `body`                                           | text                    | Trimmed plain text, 1–5,000 characters (check constraint)                     |
| `occurredAt`                                     | timestamptz             | Defaults to creation time; not in the future                                  |
| `status`                                         | enum `ACTIVE`, `VOIDED` | Voided notes are hidden from the ordinary timeline                            |
| `voidedAt`, `voidedByMembershipId`, `voidReason` | nullable                | All present only when `VOIDED` (check constraint); reason ≤ 500               |
| `authorName`                                     | varchar(200)            | Name snapshot at creation, because staff names are not readable by every role |
| `voidedByName`                                   | varchar(200), nullable  | Name snapshot when voided                                                     |
| `createdByMembershipId`                          | UUID                    | Same-workspace actor; immutable                                               |
| `createdAt`, `updatedAt`                         | timestamptz             | Required                                                                      |

### `ContactNoteRevision` → `contact_note_revisions`

Append-only history written in the same transaction as each edit.

| Field                                                      | Shape       | Rule                                 |
| ---------------------------------------------------------- | ----------- | ------------------------------------ |
| `id`, `workspaceId`, `noteId`                              | UUIDs       | Same-workspace composite foreign key |
| `previousBody`, `previousOccurredAt`, `previousVisibility` | as note     | The values replaced by the edit      |
| `editReason`                                               | varchar 500 | Required                             |
| `editedByMembershipId`, `createdAt`                        |             | Required                             |

### Constraints and indexes

- Composite foreign keys prevent cross-workspace contacts, branches, actors, and revisions.
- A trigger rejects changes to `workspaceId`, `contactId`, `branchId`, `createdByMembershipId`, and `createdAt`, and rejects un-voiding.
- Index `(workspaceId, contactId, status, occurredAt DESC)` for the timeline and `(workspaceId, branchId)` for scope checks.

## Branch rule

The owning branch is the contact's primary branch when the writer can access it; otherwise the first of the contact's active branches within the writer's scope. A writer with no in-scope branch for the contact cannot add a note. Editing or voiding requires access to the note's owning branch, even for agency-wide notes.

## Database security (RLS, defence in depth)

- **Select notes:** same workspace, the contact is visible to the member under the existing contact policy, and either `visibility = AGENCY`, workspace scope, or `branchId` in the member's allowed branches.
- **Insert notes:** the select conditions, `createdByMembershipId` equals the verified membership, and status `ACTIVE`.
- **Update notes:** the select conditions; field-level rules are enforced by the trigger and the application.
- **Revisions:** select and insert only when the parent note is visible; no update.
- **Grants:** `zayto_app` gets SELECT/INSERT/UPDATE on notes and SELECT/INSERT on revisions. No DELETE on either table. Ownership stays with `zayto_migrator`.

## Permissions

| Permission            | Granted to                                                          |
| --------------------- | ------------------------------------------------------------------- |
| `contact.note.create` | Every role that has `contact.update` (read-only users cannot write) |
| `contact.note.manage` | Account Owner, Agency Admin, Branch Manager                         |

Reading notes uses `contact.read` plus the branch rule. Managers may view voided notes with **Show voided notes**.

## Application and audit

- Server operations: `addContactNote`, `editContactNote`, `voidContactNote`, `listContactNotes` (newest `occurredAt` first, 50 per page).
- Audit actions: `contact.note.create`, `contact.note.edit`, `contact.note.void`, including denied attempts. Metadata holds the note ID, branch ID, visibility, and changed field names, never the note text or reason text.

## Interface

- A **Notes** card on the contact record with a text box, optional **When it happened**, **Share with all branches**, and **Add note**.
- A timeline showing author, date, branch or **All branches**, and an **Edited** marker.
- For managers, a per-note **Manage** dialog to edit (reason required) or void (reason and confirmation), plus **Show voided notes**.
- Responsive and light/dark from the start.

## Validation plan

- **Unit:** body, date, and reason validation; branch selection rule.
- **Disposable database:** cross-workspace denial; branch-private note hidden from another branch, agency note visible; negotiator cannot edit or void; out-of-scope manager cannot edit or void; revisions are written and append-only; runtime cannot delete; immutable fields and un-voiding are rejected; audit metadata contains no note text.
- **Browser:** add a note; manager edits and voids with reasons; mobile and dark mode.

## Deliberate exclusions

Note types, attachments, mentions, reminders or tasks, rich text, automatic activity events, and note import. Notes on properties and instructions follow in later chunks using the same pattern.

## Security review (2026-10-15)

An Opus review of the migration and service found and fixed four issues before any shared-database use:

- **Revision leakage:** revisions were readable by anyone who could see the note, so earlier branch-private wording became visible to other branches after a note was shared. Revisions are now readable only by members who can act in the owning branch, and the **Edited** marker uses a `last_edited_at` column instead of reading revisions.
- **Owning branch integrity:** inserts now require the owning branch to be one of the contact's current branches.
- **Void rewriting:** the trigger now rejects a void that also changes the body, date, or visibility.
- **Concurrent edits:** edits and voids use an integer `version` (optimistic concurrency), so a stale edit is refused instead of recording the wrong previous wording.

Accepted for now: revisions are written by the application rather than a database trigger, so a compromised application role could write misleading history. The concurrency check has no automated race test.
