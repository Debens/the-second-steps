CREATE TYPE "contact_note_visibility" AS ENUM ('branch', 'agency');
CREATE TYPE "contact_note_status" AS ENUM ('active', 'voided');

CREATE TABLE "contact_notes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "visibility" "contact_note_visibility" NOT NULL DEFAULT 'branch',
  "body" text NOT NULL,
  "occurred_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "contact_note_status" NOT NULL DEFAULT 'active',
  "last_edited_at" timestamptz(6),
  "version" integer NOT NULL DEFAULT 1,
  "voided_at" timestamptz(6),
  "voided_by_membership_id" uuid,
  "void_reason" varchar(500),
  "voided_by_name" varchar(200),
  "created_by_membership_id" uuid NOT NULL,
  "author_name" varchar(200) NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "contact_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contact_notes_workspace_id_id_key" UNIQUE ("workspace_id", "id"),
  CONSTRAINT "contact_notes_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_notes_contact_fkey"
    FOREIGN KEY ("workspace_id", "contact_id")
    REFERENCES "contacts"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_notes_branch_fkey"
    FOREIGN KEY ("workspace_id", "branch_id")
    REFERENCES "branches"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_notes_created_by_fkey"
    FOREIGN KEY ("workspace_id", "created_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_notes_voided_by_fkey"
    FOREIGN KEY ("workspace_id", "voided_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_notes_author_name_check" CHECK (
    char_length(btrim("author_name")) >= 1
  ),
  CONSTRAINT "contact_notes_version_check" CHECK ("version" >= 1),
  CONSTRAINT "contact_notes_body_check" CHECK (
    char_length(btrim("body")) BETWEEN 1 AND 5000
  ),
  CONSTRAINT "contact_notes_void_state_check" CHECK (
    (
      "status" = 'active'
      AND "voided_at" IS NULL
      AND "voided_by_membership_id" IS NULL
      AND "voided_by_name" IS NULL
      AND "void_reason" IS NULL
    )
    OR (
      "status" = 'voided'
      AND "voided_at" IS NOT NULL
      AND "voided_by_membership_id" IS NOT NULL
      AND "voided_by_name" IS NOT NULL
      AND char_length(btrim("void_reason")) BETWEEN 1 AND 500
    )
  )
);

CREATE INDEX "contact_notes_timeline_idx"
ON "contact_notes"("workspace_id", "contact_id", "status", "occurred_at" DESC);
CREATE INDEX "contact_notes_branch_idx"
ON "contact_notes"("workspace_id", "branch_id");
CREATE INDEX "contact_notes_creator_idx"
ON "contact_notes"("workspace_id", "created_by_membership_id");

CREATE TABLE "contact_note_revisions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "note_id" uuid NOT NULL,
  "previous_body" text NOT NULL,
  "previous_occurred_at" timestamptz(6) NOT NULL,
  "previous_visibility" "contact_note_visibility" NOT NULL,
  "edit_reason" varchar(500) NOT NULL,
  "edited_by_membership_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_note_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contact_note_revisions_workspace_id_id_key"
    UNIQUE ("workspace_id", "id"),
  CONSTRAINT "contact_note_revisions_note_fkey"
    FOREIGN KEY ("workspace_id", "note_id")
    REFERENCES "contact_notes"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_note_revisions_edited_by_fkey"
    FOREIGN KEY ("workspace_id", "edited_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_note_revisions_reason_check" CHECK (
    char_length(btrim("edit_reason")) BETWEEN 1 AND 500
  )
);

CREATE INDEX "contact_note_revisions_note_idx"
ON "contact_note_revisions"("workspace_id", "note_id", "created_at");
CREATE INDEX "contact_note_revisions_editor_idx"
ON "contact_note_revisions"("workspace_id", "edited_by_membership_id");

-- Ownership fields never change, and a voided note is final.
CREATE FUNCTION "public"."enforce_contact_note_rules"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."workspace_id" <> OLD."workspace_id"
    OR NEW."contact_id" <> OLD."contact_id"
    OR NEW."branch_id" <> OLD."branch_id"
    OR NEW."created_by_membership_id" <> OLD."created_by_membership_id"
    OR NEW."author_name" <> OLD."author_name"
    OR NEW."created_at" <> OLD."created_at" THEN
    RAISE EXCEPTION 'Contact note ownership fields cannot change.'
      USING ERRCODE = '23514';
  END IF;

  IF OLD."status" = 'voided' THEN
    RAISE EXCEPTION 'A voided contact note cannot be changed.'
      USING ERRCODE = '23514';
  END IF;

  -- Voiding records why a note was withdrawn; it must not rewrite the note.
  IF NEW."status" = 'voided' AND (
    NEW."body" <> OLD."body"
    OR NEW."occurred_at" <> OLD."occurred_at"
    OR NEW."visibility" <> OLD."visibility"
    OR NEW."last_edited_at" IS DISTINCT FROM OLD."last_edited_at"
  ) THEN
    RAISE EXCEPTION 'Voiding a contact note cannot change its content.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "contact_notes_enforce_rules"
BEFORE UPDATE ON "contact_notes"
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_contact_note_rules"();

ALTER TABLE "contact_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_notes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "contact_note_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_note_revisions" FORCE ROW LEVEL SECURITY;

-- A note is visible only when its contact is visible and the note is either
-- agency-wide, or the member's scope includes the owning branch.
CREATE POLICY "contact_note_select_in_scope"
ON "contact_notes"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "contact_notes"."workspace_id"
      AND "contacts"."id" = "contact_notes"."contact_id"
  )
  AND (
    current_setting('app.membership_scope_mode', true) = 'workspace'
    OR "visibility" = 'agency'
    OR "branch_id" = ANY(
      COALESCE(
        NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
        ARRAY[]::uuid[]
      )
    )
  )
);

-- Writers must be able to act in the owning branch, even for agency notes,
-- and the owning branch must be one of the contact's current branches.
CREATE POLICY "contact_note_insert_in_scope"
ON "contact_notes"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "created_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
  AND "status" = 'active'
  AND "last_edited_at" IS NULL
  AND "version" = 1
  AND EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "contact_notes"."workspace_id"
      AND "contacts"."id" = "contact_notes"."contact_id"
  )
  AND EXISTS (
    SELECT 1 FROM "contact_branch_links"
    WHERE "contact_branch_links"."workspace_id" = "contact_notes"."workspace_id"
      AND "contact_branch_links"."contact_id" = "contact_notes"."contact_id"
      AND "contact_branch_links"."branch_id" = "contact_notes"."branch_id"
      AND "contact_branch_links"."ended_at" IS NULL
  )
  AND (
    current_setting('app.membership_scope_mode', true) = 'workspace'
    OR "branch_id" = ANY(
      COALESCE(
        NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
        ARRAY[]::uuid[]
      )
    )
  )
);

CREATE POLICY "contact_note_update_in_owning_branch"
ON "contact_notes"
FOR UPDATE
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "contact_notes"."workspace_id"
      AND "contacts"."id" = "contact_notes"."contact_id"
  )
  AND (
    current_setting('app.membership_scope_mode', true) = 'workspace'
    OR "branch_id" = ANY(
      COALESCE(
        NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
        ARRAY[]::uuid[]
      )
    )
  )
)
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND (
    current_setting('app.membership_scope_mode', true) = 'workspace'
    OR "branch_id" = ANY(
      COALESCE(
        NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
        ARRAY[]::uuid[]
      )
    )
  )
);

-- Earlier wording may have been branch-private before a note was shared, so
-- history is readable only by members who can act in the owning branch.
CREATE POLICY "contact_note_revision_select_in_owning_branch"
ON "contact_note_revisions"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "contact_notes"
    WHERE "contact_notes"."workspace_id" = "contact_note_revisions"."workspace_id"
      AND "contact_notes"."id" = "contact_note_revisions"."note_id"
      AND (
        current_setting('app.membership_scope_mode', true) = 'workspace'
        OR "contact_notes"."branch_id" = ANY(
          COALESCE(
            NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
            ARRAY[]::uuid[]
          )
        )
      )
  )
);

-- A revision may only be recorded by an editor who can act in the owning
-- branch, which the note update policy already requires.
CREATE POLICY "contact_note_revision_insert_in_scope"
ON "contact_note_revisions"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "edited_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "contact_notes"
    WHERE "contact_notes"."workspace_id" = "contact_note_revisions"."workspace_id"
      AND "contact_notes"."id" = "contact_note_revisions"."note_id"
      AND (
        current_setting('app.membership_scope_mode', true) = 'workspace'
        OR "contact_notes"."branch_id" = ANY(
          COALESCE(
            NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
            ARRAY[]::uuid[]
          )
        )
      )
  )
);

GRANT SELECT, INSERT, UPDATE ON TABLE "contact_notes" TO "zayto_app";
GRANT SELECT, INSERT ON TABLE "contact_note_revisions" TO "zayto_app";

REVOKE DELETE ON TABLE "contact_notes", "contact_note_revisions"
FROM "zayto_app";
REVOKE UPDATE ON TABLE "contact_note_revisions" FROM "zayto_app";
