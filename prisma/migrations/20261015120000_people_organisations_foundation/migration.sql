CREATE TYPE "contact_kind" AS ENUM ('person', 'organisation');
CREATE TYPE "contact_status" AS ENUM ('active', 'archived', 'merged');
CREATE TYPE "organisation_type" AS ENUM (
  'limited_company', 'llp', 'partnership', 'trust', 'charity', 'other'
);
CREATE TYPE "contact_point_kind" AS ENUM ('email', 'telephone');
CREATE TYPE "communication_channel" AS ENUM (
  'email', 'telephone', 'sms', 'whatsapp', 'post'
);
CREATE TYPE "contact_address_kind" AS ENUM (
  'individual', 'registered', 'correspondence'
);

CREATE TABLE "contacts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "kind" "contact_kind" NOT NULL,
  "reference" varchar(20) NOT NULL,
  "status" "contact_status" NOT NULL DEFAULT 'active',
  "title" varchar(40),
  "first_name" varchar(100),
  "middle_names" varchar(200),
  "last_name" varchar(100),
  "preferred_name" varchar(100),
  "organisation_type" "organisation_type",
  "legal_name" varchar(200),
  "trading_name" varchar(200),
  "registration_number" varchar(64),
  "normalized_registration_number" varchar(64),
  "vat_number" varchar(32),
  "normalized_vat_number" varchar(32),
  "preferred_communication_channel" "communication_channel",
  "do_not_email" boolean NOT NULL DEFAULT false,
  "do_not_telephone" boolean NOT NULL DEFAULT false,
  "do_not_sms" boolean NOT NULL DEFAULT false,
  "do_not_whatsapp" boolean NOT NULL DEFAULT false,
  "do_not_post" boolean NOT NULL DEFAULT false,
  "merged_into_contact_id" uuid,
  "archived_at" timestamptz(6),
  "created_by_membership_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contacts_workspace_id_id_key" UNIQUE ("workspace_id", "id"),
  CONSTRAINT "contacts_workspace_id_reference_key"
    UNIQUE ("workspace_id", "reference"),
  CONSTRAINT "contacts_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contacts_workspace_id_created_by_membership_id_fkey"
    FOREIGN KEY ("workspace_id", "created_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contacts_workspace_id_merged_into_contact_id_fkey"
    FOREIGN KEY ("workspace_id", "merged_into_contact_id")
    REFERENCES "contacts"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contacts_kind_fields_check" CHECK (
    (
      "kind" = 'person'
      AND "first_name" IS NOT NULL
      AND btrim("first_name") <> ''
      AND "last_name" IS NOT NULL
      AND btrim("last_name") <> ''
      AND "organisation_type" IS NULL
      AND "legal_name" IS NULL
      AND "trading_name" IS NULL
      AND "registration_number" IS NULL
      AND "normalized_registration_number" IS NULL
      AND "vat_number" IS NULL
      AND "normalized_vat_number" IS NULL
    ) OR (
      "kind" = 'organisation'
      AND "title" IS NULL
      AND "first_name" IS NULL
      AND "middle_names" IS NULL
      AND "last_name" IS NULL
      AND "preferred_name" IS NULL
      AND "organisation_type" IS NOT NULL
      AND "legal_name" IS NOT NULL
      AND btrim("legal_name") <> ''
    )
  ),
  CONSTRAINT "contacts_registration_normalized_check" CHECK (
    ("registration_number" IS NULL AND "normalized_registration_number" IS NULL)
    OR (
      btrim("registration_number") <> ''
      AND "normalized_registration_number" IS NOT NULL
      AND "normalized_registration_number" = upper(
        regexp_replace("registration_number", '[^a-zA-Z0-9]', '', 'g')
      )
      AND "normalized_registration_number" <> ''
    )
  ),
  CONSTRAINT "contacts_vat_normalized_check" CHECK (
    ("vat_number" IS NULL AND "normalized_vat_number" IS NULL)
    OR (
      btrim("vat_number") <> ''
      AND "normalized_vat_number" IS NOT NULL
      AND "normalized_vat_number" = upper(
        regexp_replace("vat_number", '[^a-zA-Z0-9]', '', 'g')
      )
      AND "normalized_vat_number" <> ''
    )
  ),
  CONSTRAINT "contacts_lifecycle_check" CHECK (
    (
      "status" = 'active'
      AND "archived_at" IS NULL
      AND "merged_into_contact_id" IS NULL
    ) OR (
      "status" = 'archived'
      AND "archived_at" IS NOT NULL
      AND "merged_into_contact_id" IS NULL
    ) OR (
      "status" = 'merged'
      AND "archived_at" IS NOT NULL
      AND "merged_into_contact_id" IS NOT NULL
      AND "merged_into_contact_id" <> "id"
    )
  ),
  CONSTRAINT "contacts_preferred_channel_allowed_check" CHECK (
    "preferred_communication_channel" IS NULL
    OR ("preferred_communication_channel" = 'email' AND NOT "do_not_email")
    OR ("preferred_communication_channel" = 'telephone' AND NOT "do_not_telephone")
    OR ("preferred_communication_channel" = 'sms' AND NOT "do_not_sms")
    OR ("preferred_communication_channel" = 'whatsapp' AND NOT "do_not_whatsapp")
    OR ("preferred_communication_channel" = 'post' AND NOT "do_not_post")
  )
);

CREATE INDEX "contacts_workspace_id_status_idx"
ON "contacts"("workspace_id", "status");
CREATE INDEX "contacts_workspace_id_kind_last_name_idx"
ON "contacts"("workspace_id", "kind", "last_name");
CREATE INDEX "contacts_workspace_id_kind_legal_name_idx"
ON "contacts"("workspace_id", "kind", "legal_name");
CREATE INDEX "contacts_workspace_id_normalized_registration_number_idx"
ON "contacts"("workspace_id", "normalized_registration_number");
CREATE INDEX "contacts_workspace_id_normalized_vat_number_idx"
ON "contacts"("workspace_id", "normalized_vat_number");
CREATE INDEX "contacts_workspace_id_merged_into_contact_id_idx"
ON "contacts"("workspace_id", "merged_into_contact_id");
CREATE INDEX "contacts_workspace_id_created_by_membership_id_idx"
ON "contacts"("workspace_id", "created_by_membership_id");

CREATE FUNCTION "public"."protect_contact_immutable_fields"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."id" <> OLD."id"
    OR NEW."workspace_id" <> OLD."workspace_id"
    OR NEW."kind" <> OLD."kind"
    OR NEW."reference" <> OLD."reference"
    OR NEW."created_by_membership_id" <> OLD."created_by_membership_id"
    OR NEW."created_at" <> OLD."created_at"
  THEN
    RAISE EXCEPTION 'immutable contact fields cannot be changed'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "contacts_protect_immutable_fields"
BEFORE UPDATE OF
  "id", "workspace_id", "kind", "reference",
  "created_by_membership_id", "created_at"
ON "contacts"
FOR EACH ROW
EXECUTE FUNCTION "public"."protect_contact_immutable_fields"();

CREATE TABLE "contact_points" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "kind" "contact_point_kind" NOT NULL,
  "label" varchar(40),
  "value" varchar(254) NOT NULL,
  "normalized_value" varchar(254) NOT NULL,
  "is_preferred" boolean NOT NULL DEFAULT false,
  "archived_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "contact_points_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contact_points_workspace_id_id_key" UNIQUE ("workspace_id", "id"),
  CONSTRAINT "contact_points_workspace_id_contact_id_fkey"
    FOREIGN KEY ("workspace_id", "contact_id")
    REFERENCES "contacts"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_points_values_check" CHECK (
    btrim("value") <> '' AND btrim("normalized_value") <> ''
  )
);

CREATE INDEX "contact_points_workspace_id_contact_id_kind_idx"
ON "contact_points"("workspace_id", "contact_id", "kind");
CREATE INDEX "contact_points_workspace_id_kind_normalized_value_idx"
ON "contact_points"("workspace_id", "kind", "normalized_value");
CREATE UNIQUE INDEX "contact_points_one_active_preferred_kind"
ON "contact_points"("workspace_id", "contact_id", "kind")
WHERE "is_preferred" AND "archived_at" IS NULL;

CREATE TABLE "contact_addresses" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "kind" "contact_address_kind" NOT NULL,
  "address_line_1" varchar(160) NOT NULL,
  "address_line_2" varchar(160),
  "locality" varchar(100),
  "town_city" varchar(100) NOT NULL,
  "county" varchar(100),
  "postcode" varchar(16) NOT NULL,
  "country_code" char(2) NOT NULL DEFAULT 'GB',
  "archived_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "contact_addresses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contact_addresses_workspace_id_id_key" UNIQUE ("workspace_id", "id"),
  CONSTRAINT "contact_addresses_workspace_id_contact_id_fkey"
    FOREIGN KEY ("workspace_id", "contact_id")
    REFERENCES "contacts"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_addresses_values_check" CHECK (
    btrim("address_line_1") <> ''
    AND btrim("town_city") <> ''
    AND btrim("postcode") <> ''
    AND "country_code" ~ '^[A-Z]{2}$'
  )
);

CREATE INDEX "contact_addresses_workspace_id_contact_id_kind_idx"
ON "contact_addresses"("workspace_id", "contact_id", "kind");
CREATE INDEX "contact_addresses_workspace_id_postcode_idx"
ON "contact_addresses"("workspace_id", "postcode");
CREATE UNIQUE INDEX "contact_addresses_one_active_kind"
ON "contact_addresses"("workspace_id", "contact_id", "kind")
WHERE "archived_at" IS NULL;

CREATE TABLE "organisation_person_links" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "organisation_contact_id" uuid NOT NULL,
  "person_contact_id" uuid NOT NULL,
  "relationship_label" varchar(100),
  "is_primary" boolean NOT NULL DEFAULT false,
  "started_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "organisation_person_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "organisation_person_links_workspace_id_id_key"
    UNIQUE ("workspace_id", "id"),
  CONSTRAINT "organisation_person_links_organisation_fkey"
    FOREIGN KEY ("workspace_id", "organisation_contact_id")
    REFERENCES "contacts"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "organisation_person_links_person_fkey"
    FOREIGN KEY ("workspace_id", "person_contact_id")
    REFERENCES "contacts"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "organisation_person_links_dates_check" CHECK (
    "ended_at" IS NULL OR "ended_at" >= "started_at"
  )
);

CREATE INDEX "organisation_person_links_organisation_idx"
ON "organisation_person_links"("workspace_id", "organisation_contact_id", "ended_at");
CREATE INDEX "organisation_person_links_person_idx"
ON "organisation_person_links"("workspace_id", "person_contact_id", "ended_at");
CREATE UNIQUE INDEX "organisation_person_links_one_active_pair"
ON "organisation_person_links"(
  "workspace_id", "organisation_contact_id", "person_contact_id"
)
WHERE "ended_at" IS NULL;
CREATE UNIQUE INDEX "organisation_person_links_one_active_primary"
ON "organisation_person_links"("workspace_id", "organisation_contact_id")
WHERE "is_primary" AND "ended_at" IS NULL;

CREATE TABLE "contact_branch_links" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "contact_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "is_primary" boolean NOT NULL DEFAULT false,
  "started_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" timestamptz(6),
  "created_by_membership_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "contact_branch_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contact_branch_links_workspace_id_id_key"
    UNIQUE ("workspace_id", "id"),
  CONSTRAINT "contact_branch_links_contact_fkey"
    FOREIGN KEY ("workspace_id", "contact_id")
    REFERENCES "contacts"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_branch_links_branch_fkey"
    FOREIGN KEY ("workspace_id", "branch_id")
    REFERENCES "branches"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_branch_links_creator_fkey"
    FOREIGN KEY ("workspace_id", "created_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "contact_branch_links_dates_check" CHECK (
    "ended_at" IS NULL OR "ended_at" >= "started_at"
  )
);

CREATE INDEX "contact_branch_links_contact_idx"
ON "contact_branch_links"("workspace_id", "contact_id", "ended_at");
CREATE INDEX "contact_branch_links_branch_idx"
ON "contact_branch_links"("workspace_id", "branch_id", "ended_at");
CREATE INDEX "contact_branch_links_creator_idx"
ON "contact_branch_links"("workspace_id", "created_by_membership_id");
CREATE UNIQUE INDEX "contact_branch_links_one_active_branch"
ON "contact_branch_links"("workspace_id", "contact_id", "branch_id")
WHERE "ended_at" IS NULL;
CREATE UNIQUE INDEX "contact_branch_links_one_active_primary"
ON "contact_branch_links"("workspace_id", "contact_id")
WHERE "is_primary" AND "ended_at" IS NULL;

CREATE FUNCTION "public"."validate_contact_address_kind"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_kind "contact_kind";
BEGIN
  SELECT "kind" INTO parent_kind
  FROM "contacts"
  WHERE "workspace_id" = NEW."workspace_id"
    AND "id" = NEW."contact_id";

  IF parent_kind IS NULL
    OR (parent_kind = 'person' AND NEW."kind" <> 'individual')
    OR (parent_kind = 'organisation' AND NEW."kind" = 'individual')
  THEN
    RAISE EXCEPTION 'address kind does not match contact kind'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "contact_addresses_validate_kind"
BEFORE INSERT OR UPDATE OF "workspace_id", "contact_id", "kind"
ON "contact_addresses"
FOR EACH ROW
EXECUTE FUNCTION "public"."validate_contact_address_kind"();

CREATE FUNCTION "public"."validate_organisation_person_link_kinds"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "workspace_id" = NEW."workspace_id"
      AND "id" = NEW."organisation_contact_id"
      AND "kind" = 'organisation'
  ) OR NOT EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "workspace_id" = NEW."workspace_id"
      AND "id" = NEW."person_contact_id"
      AND "kind" = 'person'
  ) THEN
    RAISE EXCEPTION 'organisation-person link has incorrect contact kinds'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "organisation_person_links_validate_kinds"
BEFORE INSERT OR UPDATE OF
  "workspace_id", "organisation_contact_id", "person_contact_id"
ON "organisation_person_links"
FOR EACH ROW
EXECUTE FUNCTION "public"."validate_organisation_person_link_kinds"();

CREATE FUNCTION "public"."enforce_active_contact_branch_link"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  affected_workspace_id uuid;
  affected_contact_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'contacts' THEN
    affected_workspace_id := COALESCE(NEW."workspace_id", OLD."workspace_id");
    affected_contact_id := COALESCE(NEW."id", OLD."id");
  ELSE
    affected_workspace_id := COALESCE(NEW."workspace_id", OLD."workspace_id");
    affected_contact_id := COALESCE(NEW."contact_id", OLD."contact_id");
  END IF;

  IF EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "workspace_id" = affected_workspace_id
      AND "id" = affected_contact_id
      AND "status" = 'active'
  ) AND NOT EXISTS (
    SELECT 1 FROM "contact_branch_links"
    WHERE "workspace_id" = affected_workspace_id
      AND "contact_id" = affected_contact_id
      AND "ended_at" IS NULL
      AND "is_primary"
  ) THEN
    RAISE EXCEPTION 'active contact requires an active primary branch link'
      USING ERRCODE = '23514';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE CONSTRAINT TRIGGER "contacts_require_branch_link"
AFTER INSERT OR UPDATE OF "status" ON "contacts"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_active_contact_branch_link"();

CREATE CONSTRAINT TRIGGER "contact_branch_links_preserve_active_contact"
AFTER DELETE OR UPDATE OF "workspace_id", "contact_id", "ended_at", "is_primary"
ON "contact_branch_links"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_active_contact_branch_link"();

ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "contact_points" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_points" FORCE ROW LEVEL SECURITY;
ALTER TABLE "contact_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_addresses" FORCE ROW LEVEL SECURITY;
ALTER TABLE "organisation_person_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organisation_person_links" FORCE ROW LEVEL SECURITY;
ALTER TABLE "contact_branch_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_branch_links" FORCE ROW LEVEL SECURITY;

CREATE POLICY "contact_branch_link_select_in_scope"
ON "contact_branch_links"
FOR SELECT
USING (
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

CREATE POLICY "contact_branch_link_insert_in_scope"
ON "contact_branch_links"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "created_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
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

CREATE POLICY "contact_branch_link_update_in_scope"
ON "contact_branch_links"
FOR UPDATE
USING (
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

CREATE POLICY "contact_select_in_scope"
ON "contacts"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND (
    current_setting('app.membership_scope_mode', true) = 'workspace'
    OR EXISTS (
      SELECT 1 FROM "contact_branch_links"
      WHERE "contact_branch_links"."workspace_id" = "contacts"."workspace_id"
        AND "contact_branch_links"."contact_id" = "contacts"."id"
        AND "contact_branch_links"."ended_at" IS NULL
    )
    OR (
      "created_by_membership_id" =
        NULLIF(current_setting('app.membership_id', true), '')::uuid
      AND NOT EXISTS (
        SELECT 1 FROM "contact_branch_links"
        WHERE "contact_branch_links"."workspace_id" = "contacts"."workspace_id"
          AND "contact_branch_links"."contact_id" = "contacts"."id"
          AND "contact_branch_links"."ended_at" IS NULL
      )
    )
  )
);

CREATE POLICY "contact_insert_by_member"
ON "contacts"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "created_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
);

CREATE POLICY "contact_update_in_scope"
ON "contacts"
FOR UPDATE
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND (
    current_setting('app.membership_scope_mode', true) = 'workspace'
    OR EXISTS (
      SELECT 1 FROM "contact_branch_links"
      WHERE "contact_branch_links"."workspace_id" = "contacts"."workspace_id"
        AND "contact_branch_links"."contact_id" = "contacts"."id"
        AND "contact_branch_links"."ended_at" IS NULL
    )
  )
)
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "contact_point_select_in_scope"
ON "contact_points"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "contact_points"."workspace_id"
      AND "contacts"."id" = "contact_points"."contact_id"
  )
);
CREATE POLICY "contact_point_insert_in_scope"
ON "contact_points"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "contact_points"."workspace_id"
      AND "contacts"."id" = "contact_points"."contact_id"
  )
);
CREATE POLICY "contact_point_update_in_scope"
ON "contact_points"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "contact_points"."workspace_id"
      AND "contacts"."id" = "contact_points"."contact_id"
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "contact_points"."workspace_id"
      AND "contacts"."id" = "contact_points"."contact_id"
  )
);

CREATE POLICY "contact_address_select_in_scope"
ON "contact_addresses"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "contact_addresses"."workspace_id"
      AND "contacts"."id" = "contact_addresses"."contact_id"
  )
);
CREATE POLICY "contact_address_insert_in_scope"
ON "contact_addresses"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "contact_addresses"."workspace_id"
      AND "contacts"."id" = "contact_addresses"."contact_id"
  )
);
CREATE POLICY "contact_address_update_in_scope"
ON "contact_addresses"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "contact_addresses"."workspace_id"
      AND "contacts"."id" = "contact_addresses"."contact_id"
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "contact_addresses"."workspace_id"
      AND "contacts"."id" = "contact_addresses"."contact_id"
  )
);

CREATE POLICY "organisation_person_link_select_in_scope"
ON "organisation_person_links"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "organisation_person_links"."workspace_id"
      AND "contacts"."id" = "organisation_person_links"."organisation_contact_id"
  )
  AND EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "organisation_person_links"."workspace_id"
      AND "contacts"."id" = "organisation_person_links"."person_contact_id"
  )
);
CREATE POLICY "organisation_person_link_insert_in_scope"
ON "organisation_person_links"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "organisation_person_links"."workspace_id"
      AND "contacts"."id" = "organisation_person_links"."organisation_contact_id"
  )
  AND EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "organisation_person_links"."workspace_id"
      AND "contacts"."id" = "organisation_person_links"."person_contact_id"
  )
);
CREATE POLICY "organisation_person_link_update_in_scope"
ON "organisation_person_links"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "organisation_person_links"."workspace_id"
      AND "contacts"."id" = "organisation_person_links"."organisation_contact_id"
  )
  AND EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "organisation_person_links"."workspace_id"
      AND "contacts"."id" = "organisation_person_links"."person_contact_id"
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "organisation_person_links"."workspace_id"
      AND "contacts"."id" = "organisation_person_links"."organisation_contact_id"
  )
  AND EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "contacts"."workspace_id" = "organisation_person_links"."workspace_id"
      AND "contacts"."id" = "organisation_person_links"."person_contact_id"
  )
);

GRANT SELECT, INSERT, UPDATE ON TABLE
  "contacts",
  "contact_points",
  "contact_addresses",
  "organisation_person_links",
  "contact_branch_links"
TO "zayto_app";

REVOKE DELETE ON TABLE
  "contacts",
  "contact_points",
  "contact_addresses",
  "organisation_person_links",
  "contact_branch_links"
FROM "zayto_app";
