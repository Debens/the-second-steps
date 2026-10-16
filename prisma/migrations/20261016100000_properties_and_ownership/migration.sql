CREATE TYPE "property_status" AS ENUM ('active', 'archived');
CREATE TYPE "property_type" AS ENUM (
  'detached', 'semi_detached', 'terraced', 'bungalow', 'flat',
  'maisonette', 'room', 'other'
);
CREATE TYPE "furnished_status" AS ENUM (
  'furnished', 'part_furnished', 'unfurnished', 'flexible'
);
CREATE TYPE "floor_area_unit" AS ENUM ('sq_ft', 'sq_m');
CREATE TYPE "council_tax_band" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H');
CREATE TYPE "property_feature" AS ENUM (
  'private_garden', 'communal_garden', 'balcony', 'terrace', 'patio',
  'off_street_parking', 'allocated_parking', 'garage', 'on_street_parking',
  'permit_parking', 'ev_charging',
  'lift', 'concierge', 'bike_storage', 'wheelchair_accessible',
  'gas_central_heating', 'electric_heating', 'underfloor_heating',
  'en_suite', 'utility_room', 'dishwasher', 'washing_machine', 'fireplace'
);
CREATE TYPE "property_note_status" AS ENUM ('active', 'voided');

CREATE TABLE "properties" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "reference" varchar(20) NOT NULL,
  "responsible_branch_id" uuid NOT NULL,
  "status" "property_status" NOT NULL DEFAULT 'active',
  "address_building" varchar(160),
  "address_street" varchar(160) NOT NULL,
  "address_locality" varchar(100),
  "town_city" varchar(100) NOT NULL,
  "county" varchar(100),
  "postcode" varchar(8) NOT NULL,
  "country_code" char(2) NOT NULL DEFAULT 'GB',
  "normalized_address_key" varchar(400) NOT NULL,
  "property_type" "property_type" NOT NULL,
  "bedrooms" smallint,
  "bathrooms" smallint,
  "reception_rooms" smallint,
  "floor_area" integer,
  "floor_area_unit" "floor_area_unit",
  "furnished_status" "furnished_status",
  "features" "property_feature"[] NOT NULL DEFAULT ARRAY[]::"property_feature"[],
  "parking_notes" varchar(500),
  "outdoor_space_notes" varchar(500),
  "council_tax_band" "council_tax_band",
  "general_notes" varchar(2000),
  "archived_at" timestamptz(6),
  "created_by_membership_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "properties_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "properties_workspace_id_id_key" UNIQUE ("workspace_id", "id"),
  CONSTRAINT "properties_workspace_id_reference_key"
    UNIQUE ("workspace_id", "reference"),
  CONSTRAINT "properties_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "properties_responsible_branch_fkey"
    FOREIGN KEY ("workspace_id", "responsible_branch_id")
    REFERENCES "branches"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "properties_created_by_fkey"
    FOREIGN KEY ("workspace_id", "created_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "properties_reference_check" CHECK (
    "reference" ~ '^PRP-[2-9A-HJ-NP-Z]{8}$'
  ),
  CONSTRAINT "properties_address_check" CHECK (
    ("address_building" IS NULL OR btrim("address_building") <> '')
    AND btrim("address_street") <> ''
    AND ("address_locality" IS NULL OR btrim("address_locality") <> '')
    AND btrim("town_city") <> ''
    AND ("county" IS NULL OR btrim("county") <> '')
    AND "postcode" ~ '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$'
    AND "country_code" = 'GB'
    AND btrim("normalized_address_key") <> ''
  ),
  CONSTRAINT "properties_rooms_check" CHECK (
    ("bedrooms" IS NULL OR "bedrooms" BETWEEN 0 AND 50)
    AND ("bathrooms" IS NULL OR "bathrooms" BETWEEN 0 AND 50)
    AND ("reception_rooms" IS NULL OR "reception_rooms" BETWEEN 0 AND 50)
  ),
  CONSTRAINT "properties_floor_area_check" CHECK (
    ("floor_area" IS NULL AND "floor_area_unit" IS NULL)
    OR (
      "floor_area" BETWEEN 1 AND 100000
      AND "floor_area_unit" IS NOT NULL
    )
  ),
  CONSTRAINT "properties_free_text_check" CHECK (
    ("parking_notes" IS NULL OR btrim("parking_notes") <> '')
    AND ("outdoor_space_notes" IS NULL OR btrim("outdoor_space_notes") <> '')
    AND ("general_notes" IS NULL OR btrim("general_notes") <> '')
  ),
  CONSTRAINT "properties_lifecycle_check" CHECK (
    ("status" = 'active' AND "archived_at" IS NULL)
    OR ("status" = 'archived' AND "archived_at" IS NOT NULL)
  )
);

CREATE INDEX "properties_branch_status_idx"
ON "properties"("workspace_id", "responsible_branch_id", "status");
CREATE INDEX "properties_status_updated_idx"
ON "properties"("workspace_id", "status", "updated_at" DESC);
CREATE INDEX "properties_postcode_idx"
ON "properties"("workspace_id", "postcode");
CREATE INDEX "properties_address_key_idx"
ON "properties"("workspace_id", "normalized_address_key");
CREATE INDEX "properties_creator_idx"
ON "properties"("workspace_id", "created_by_membership_id");

CREATE TABLE "property_branch_transfers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "from_branch_id" uuid NOT NULL,
  "to_branch_id" uuid NOT NULL,
  "reason" varchar(500) NOT NULL,
  "transferred_by_membership_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_branch_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "property_branch_transfers_workspace_id_id_key"
    UNIQUE ("workspace_id", "id"),
  CONSTRAINT "property_branch_transfers_property_fkey"
    FOREIGN KEY ("workspace_id", "property_id")
    REFERENCES "properties"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_branch_transfers_from_branch_fkey"
    FOREIGN KEY ("workspace_id", "from_branch_id")
    REFERENCES "branches"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_branch_transfers_to_branch_fkey"
    FOREIGN KEY ("workspace_id", "to_branch_id")
    REFERENCES "branches"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_branch_transfers_actor_fkey"
    FOREIGN KEY ("workspace_id", "transferred_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_branch_transfers_branches_check" CHECK (
    "from_branch_id" <> "to_branch_id"
  ),
  CONSTRAINT "property_branch_transfers_reason_check" CHECK (
    char_length(btrim("reason")) BETWEEN 1 AND 500
  )
);

CREATE INDEX "property_branch_transfers_property_idx"
ON "property_branch_transfers"("workspace_id", "property_id", "created_at");
CREATE INDEX "property_branch_transfers_from_idx"
ON "property_branch_transfers"("workspace_id", "from_branch_id");
CREATE INDEX "property_branch_transfers_to_idx"
ON "property_branch_transfers"("workspace_id", "to_branch_id");
CREATE INDEX "property_branch_transfers_actor_idx"
ON "property_branch_transfers"("workspace_id", "transferred_by_membership_id");

-- Identity fields never change, and the responsible branch changes only with
-- a transfer record written by the same actor in the same transaction.
CREATE FUNCTION "public"."enforce_property_rules"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."id" <> OLD."id"
    OR NEW."workspace_id" <> OLD."workspace_id"
    OR NEW."reference" <> OLD."reference"
    OR NEW."created_by_membership_id" <> OLD."created_by_membership_id"
    OR NEW."created_at" <> OLD."created_at"
  THEN
    RAISE EXCEPTION 'immutable property fields cannot be changed'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."responsible_branch_id" <> OLD."responsible_branch_id"
    AND NOT EXISTS (
      SELECT 1 FROM "property_branch_transfers"
      WHERE "workspace_id" = NEW."workspace_id"
        AND "property_id" = NEW."id"
        AND "from_branch_id" = OLD."responsible_branch_id"
        AND "to_branch_id" = NEW."responsible_branch_id"
        AND "transferred_by_membership_id" =
          NULLIF(current_setting('app.membership_id', true), '')::uuid
        AND "created_at" = transaction_timestamp()
    )
  THEN
    RAISE EXCEPTION 'property branch changes require a transfer record'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "properties_enforce_rules"
BEFORE UPDATE ON "properties"
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_property_rules"();

-- A transfer record is kept only if the property really moved, so the
-- history cannot contain transfers that never happened.
CREATE FUNCTION "public"."enforce_property_transfer_applied"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "properties"
    WHERE "workspace_id" = NEW."workspace_id"
      AND "id" = NEW."property_id"
      AND "responsible_branch_id" = NEW."to_branch_id"
  ) AND NOT EXISTS (
    SELECT 1 FROM "property_branch_transfers"
    WHERE "workspace_id" = NEW."workspace_id"
      AND "property_id" = NEW."property_id"
      AND "from_branch_id" = NEW."to_branch_id"
      AND "created_at" = NEW."created_at"
      AND "id" <> NEW."id"
  ) THEN
    RAISE EXCEPTION 'a property transfer must move the property'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "property_branch_transfers_require_move"
AFTER INSERT ON "property_branch_transfers"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_property_transfer_applied"();

CREATE TABLE "property_ownerships" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "is_lead" boolean NOT NULL DEFAULT false,
  "started_on" date,
  "ended_on" date,
  "ended_at" timestamptz(6),
  "end_reason" varchar(500),
  "created_by_membership_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "property_ownerships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "property_ownerships_workspace_id_id_key"
    UNIQUE ("workspace_id", "id"),
  CONSTRAINT "property_ownerships_property_fkey"
    FOREIGN KEY ("workspace_id", "property_id")
    REFERENCES "properties"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_ownerships_contact_fkey"
    FOREIGN KEY ("workspace_id", "contact_id")
    REFERENCES "contacts"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_ownerships_created_by_fkey"
    FOREIGN KEY ("workspace_id", "created_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_ownerships_end_state_check" CHECK (
    (
      "ended_at" IS NULL
      AND "ended_on" IS NULL
      AND "end_reason" IS NULL
    ) OR (
      "ended_at" IS NOT NULL
      AND char_length(btrim("end_reason")) BETWEEN 1 AND 500
      AND NOT "is_lead"
    )
  ),
  CONSTRAINT "property_ownerships_dates_check" CHECK (
    "started_on" IS NULL OR "ended_on" IS NULL OR "ended_on" >= "started_on"
  )
);

CREATE INDEX "property_ownerships_property_idx"
ON "property_ownerships"("workspace_id", "property_id", "ended_at");
CREATE INDEX "property_ownerships_contact_idx"
ON "property_ownerships"("workspace_id", "contact_id", "ended_at");
CREATE INDEX "property_ownerships_creator_idx"
ON "property_ownerships"("workspace_id", "created_by_membership_id");
CREATE UNIQUE INDEX "property_ownerships_one_current_per_contact"
ON "property_ownerships"("workspace_id", "property_id", "contact_id")
WHERE "ended_at" IS NULL;
CREATE UNIQUE INDEX "property_ownerships_one_current_lead"
ON "property_ownerships"("workspace_id", "property_id")
WHERE "is_lead" AND "ended_at" IS NULL;

-- A current owner must be an active contact; a merged record never owns.
CREATE FUNCTION "public"."validate_property_ownership_contact"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  owner_status "contact_status";
BEGIN
  SELECT "status" INTO owner_status
  FROM "contacts"
  WHERE "workspace_id" = NEW."workspace_id"
    AND "id" = NEW."contact_id";

  -- A missing or hidden contact is rejected by the foreign key or the
  -- ownership insert policy, which report the real reason.
  IF owner_status = 'merged'
    OR (NEW."ended_at" IS NULL AND owner_status <> 'active')
  THEN
    RAISE EXCEPTION 'property owner must be an active, unmerged contact'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "property_ownerships_validate_contact"
BEFORE INSERT ON "property_ownerships"
FOR EACH ROW
EXECUTE FUNCTION "public"."validate_property_ownership_contact"();

-- Only ending an ownership or moving the lead marker may change a row, and an
-- ended ownership is permanent history.
CREATE FUNCTION "public"."enforce_property_ownership_rules"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."ended_at" IS NOT NULL THEN
    RAISE EXCEPTION 'an ended property ownership cannot be changed'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."id" <> OLD."id"
    OR NEW."workspace_id" <> OLD."workspace_id"
    OR NEW."property_id" <> OLD."property_id"
    OR NEW."contact_id" <> OLD."contact_id"
    OR NEW."started_on" IS DISTINCT FROM OLD."started_on"
    OR NEW."created_by_membership_id" <> OLD."created_by_membership_id"
    OR NEW."created_at" <> OLD."created_at"
  THEN
    RAISE EXCEPTION 'property ownership fields cannot be changed'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "property_ownerships_enforce_rules"
BEFORE UPDATE ON "property_ownerships"
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_property_ownership_rules"();

-- A contact who currently owns a property cannot be archived or merged. The
-- archiving user may not be able to see that property, so the database keeps
-- a count on the contact rather than relying on a visibility-limited lookup.
ALTER TABLE "contacts"
ADD COLUMN "current_property_ownership_count" integer NOT NULL DEFAULT 0,
ADD CONSTRAINT "contacts_property_ownership_count_check" CHECK (
  "current_property_ownership_count" >= 0
  AND ("status" = 'active' OR "current_property_ownership_count" = 0)
);

CREATE FUNCTION "public"."protect_contact_ownership_count"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW."current_property_ownership_count" <> 0 THEN
    RAISE EXCEPTION 'a new contact cannot start with property ownerships'
      USING ERRCODE = '23514';
  END IF;

  -- Only the ownership trigger below (a nested trigger) may change the count.
  IF TG_OP = 'UPDATE'
    AND NEW."current_property_ownership_count" <>
      OLD."current_property_ownership_count"
    AND pg_trigger_depth() < 2
  THEN
    RAISE EXCEPTION 'property ownership count is maintained by the database'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "contacts_protect_ownership_count"
BEFORE INSERT OR UPDATE OF "current_property_ownership_count" ON "contacts"
FOR EACH ROW
EXECUTE FUNCTION "public"."protect_contact_ownership_count"();

CREATE FUNCTION "public"."maintain_contact_ownership_count"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  delta integer := 0;
  updated_rows integer;
BEGIN
  IF TG_OP = 'INSERT' AND NEW."ended_at" IS NULL THEN
    delta := 1;
  ELSIF TG_OP = 'UPDATE'
    AND OLD."ended_at" IS NULL
    AND NEW."ended_at" IS NOT NULL
  THEN
    delta := -1;
  END IF;

  IF delta <> 0 THEN
    UPDATE "contacts"
    SET "current_property_ownership_count" =
      "current_property_ownership_count" + delta
    WHERE "workspace_id" = NEW."workspace_id"
      AND "id" = NEW."contact_id";

    -- Row security silently skips rows the actor cannot update; never let the
    -- count drift because of that.
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    IF updated_rows <> 1 THEN
      RAISE EXCEPTION 'property owner contact is not available to this user'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "property_ownerships_maintain_contact_count"
AFTER INSERT OR UPDATE OF "ended_at" ON "property_ownerships"
FOR EACH ROW
EXECUTE FUNCTION "public"."maintain_contact_ownership_count"();

CREATE TABLE "property_notes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "property_id" uuid NOT NULL,
  "body" text NOT NULL,
  "occurred_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "property_note_status" NOT NULL DEFAULT 'active',
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
  CONSTRAINT "property_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "property_notes_workspace_id_id_key" UNIQUE ("workspace_id", "id"),
  CONSTRAINT "property_notes_property_fkey"
    FOREIGN KEY ("workspace_id", "property_id")
    REFERENCES "properties"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_notes_created_by_fkey"
    FOREIGN KEY ("workspace_id", "created_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_notes_voided_by_fkey"
    FOREIGN KEY ("workspace_id", "voided_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_notes_author_name_check" CHECK (
    char_length(btrim("author_name")) >= 1
  ),
  CONSTRAINT "property_notes_version_check" CHECK ("version" >= 1),
  CONSTRAINT "property_notes_body_check" CHECK (
    char_length(btrim("body")) BETWEEN 1 AND 5000
  ),
  CONSTRAINT "property_notes_void_state_check" CHECK (
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

CREATE INDEX "property_notes_timeline_idx"
ON "property_notes"("workspace_id", "property_id", "status", "occurred_at" DESC);
CREATE INDEX "property_notes_creator_idx"
ON "property_notes"("workspace_id", "created_by_membership_id");

CREATE TABLE "property_note_revisions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "note_id" uuid NOT NULL,
  "previous_body" text NOT NULL,
  "previous_occurred_at" timestamptz(6) NOT NULL,
  "edit_reason" varchar(500) NOT NULL,
  "edited_by_membership_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "property_note_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "property_note_revisions_workspace_id_id_key"
    UNIQUE ("workspace_id", "id"),
  CONSTRAINT "property_note_revisions_note_fkey"
    FOREIGN KEY ("workspace_id", "note_id")
    REFERENCES "property_notes"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_note_revisions_edited_by_fkey"
    FOREIGN KEY ("workspace_id", "edited_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "property_note_revisions_reason_check" CHECK (
    char_length(btrim("edit_reason")) BETWEEN 1 AND 500
  )
);

CREATE INDEX "property_note_revisions_note_idx"
ON "property_note_revisions"("workspace_id", "note_id", "created_at");
CREATE INDEX "property_note_revisions_editor_idx"
ON "property_note_revisions"("workspace_id", "edited_by_membership_id");

-- Ownership fields never change, and a voided note is final.
CREATE FUNCTION "public"."enforce_property_note_rules"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."workspace_id" <> OLD."workspace_id"
    OR NEW."property_id" <> OLD."property_id"
    OR NEW."created_by_membership_id" <> OLD."created_by_membership_id"
    OR NEW."author_name" <> OLD."author_name"
    OR NEW."created_at" <> OLD."created_at" THEN
    RAISE EXCEPTION 'Property note ownership fields cannot change.'
      USING ERRCODE = '23514';
  END IF;

  IF OLD."status" = 'voided' THEN
    RAISE EXCEPTION 'A voided property note cannot be changed.'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."status" = 'voided' AND (
    NEW."body" <> OLD."body"
    OR NEW."occurred_at" <> OLD."occurred_at"
    OR NEW."last_edited_at" IS DISTINCT FROM OLD."last_edited_at"
  ) THEN
    RAISE EXCEPTION 'Voiding a property note cannot change its content.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "property_notes_enforce_rules"
BEFORE UPDATE ON "property_notes"
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_property_note_rules"();

ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "properties" FORCE ROW LEVEL SECURITY;
ALTER TABLE "property_branch_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_branch_transfers" FORCE ROW LEVEL SECURITY;
ALTER TABLE "property_ownerships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_ownerships" FORCE ROW LEVEL SECURITY;
ALTER TABLE "property_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_notes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "property_note_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_note_revisions" FORCE ROW LEVEL SECURITY;

-- A property is visible to workspace-scoped members, or to members whose
-- named branches include its responsible branch.
CREATE POLICY "property_select_in_scope"
ON "properties"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND (
    current_setting('app.membership_scope_mode', true) = 'workspace'
    OR "responsible_branch_id" = ANY(
      COALESCE(
        NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
        ARRAY[]::uuid[]
      )
    )
  )
);

CREATE POLICY "property_insert_in_scope"
ON "properties"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "created_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
  AND (
    current_setting('app.membership_scope_mode', true) = 'workspace'
    OR "responsible_branch_id" = ANY(
      COALESCE(
        NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
        ARRAY[]::uuid[]
      )
    )
  )
);

-- The new responsible branch must also be within the actor's scope, so a
-- transfer can only move a property between branches the actor manages.
CREATE POLICY "property_update_in_scope"
ON "properties"
FOR UPDATE
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND (
    current_setting('app.membership_scope_mode', true) = 'workspace'
    OR "responsible_branch_id" = ANY(
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
    OR "responsible_branch_id" = ANY(
      COALESCE(
        NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
        ARRAY[]::uuid[]
      )
    )
  )
);

CREATE POLICY "property_branch_transfer_select_in_scope"
ON "property_branch_transfers"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "properties"
    WHERE "properties"."workspace_id" = "property_branch_transfers"."workspace_id"
      AND "properties"."id" = "property_branch_transfers"."property_id"
  )
);

-- A transfer starts from the property's current branch, which the actor can
-- see, and goes to a branch the actor can also act in.
CREATE POLICY "property_branch_transfer_insert_in_scope"
ON "property_branch_transfers"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "transferred_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
  AND "created_at" = CURRENT_TIMESTAMP
  AND EXISTS (
    SELECT 1 FROM "properties"
    WHERE "properties"."workspace_id" = "property_branch_transfers"."workspace_id"
      AND "properties"."id" = "property_branch_transfers"."property_id"
      AND "properties"."responsible_branch_id" =
        "property_branch_transfers"."from_branch_id"
  )
  AND (
    current_setting('app.membership_scope_mode', true) = 'workspace'
    OR "to_branch_id" = ANY(
      COALESCE(
        NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
        ARRAY[]::uuid[]
      )
    )
  )
);

-- An ownership is visible only when both its property and its owner are
-- visible, so a hidden contact never appears through a property.
CREATE POLICY "property_ownership_select_in_scope"
ON "property_ownerships"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "properties"
    WHERE "properties"."workspace_id" = "property_ownerships"."workspace_id"
      AND "properties"."id" = "property_ownerships"."property_id"
  )
  AND EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "property_ownerships"."workspace_id"
      AND "contacts"."id" = "property_ownerships"."contact_id"
  )
);

CREATE POLICY "property_ownership_insert_in_scope"
ON "property_ownerships"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "created_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "properties"
    WHERE "properties"."workspace_id" = "property_ownerships"."workspace_id"
      AND "properties"."id" = "property_ownerships"."property_id"
  )
  AND EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "property_ownerships"."workspace_id"
      AND "contacts"."id" = "property_ownerships"."contact_id"
  )
);

CREATE POLICY "property_ownership_update_in_scope"
ON "property_ownerships"
FOR UPDATE
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "properties"
    WHERE "properties"."workspace_id" = "property_ownerships"."workspace_id"
      AND "properties"."id" = "property_ownerships"."property_id"
  )
  AND EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "property_ownerships"."workspace_id"
      AND "contacts"."id" = "property_ownerships"."contact_id"
  )
)
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

-- A property has one responsible branch, so its notes are visible to
-- everyone who can see the property.
CREATE POLICY "property_note_select_in_scope"
ON "property_notes"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "properties"
    WHERE "properties"."workspace_id" = "property_notes"."workspace_id"
      AND "properties"."id" = "property_notes"."property_id"
  )
);

CREATE POLICY "property_note_insert_in_scope"
ON "property_notes"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "created_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
  AND "status" = 'active'
  AND "last_edited_at" IS NULL
  AND "version" = 1
  AND EXISTS (
    SELECT 1 FROM "properties"
    WHERE "properties"."workspace_id" = "property_notes"."workspace_id"
      AND "properties"."id" = "property_notes"."property_id"
  )
);

CREATE POLICY "property_note_update_in_scope"
ON "property_notes"
FOR UPDATE
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "properties"
    WHERE "properties"."workspace_id" = "property_notes"."workspace_id"
      AND "properties"."id" = "property_notes"."property_id"
  )
)
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "property_note_revision_select_in_scope"
ON "property_note_revisions"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "property_notes"
    WHERE "property_notes"."workspace_id" = "property_note_revisions"."workspace_id"
      AND "property_notes"."id" = "property_note_revisions"."note_id"
  )
);

CREATE POLICY "property_note_revision_insert_in_scope"
ON "property_note_revisions"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "edited_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "property_notes"
    WHERE "property_notes"."workspace_id" = "property_note_revisions"."workspace_id"
      AND "property_notes"."id" = "property_note_revisions"."note_id"
  )
);

GRANT SELECT, INSERT, UPDATE ON TABLE
  "properties",
  "property_ownerships",
  "property_notes"
TO "zayto_app";
GRANT SELECT, INSERT ON TABLE
  "property_branch_transfers",
  "property_note_revisions"
TO "zayto_app";

REVOKE DELETE ON TABLE
  "properties",
  "property_ownerships",
  "property_branch_transfers",
  "property_notes",
  "property_note_revisions"
FROM "zayto_app";
REVOKE UPDATE ON TABLE
  "property_branch_transfers",
  "property_note_revisions"
FROM "zayto_app";
