-- Chunk 5A: enquiries, appraisals and next actions.
-- Follows the 2026-10-16 property security review: every function pins its
-- search path, protected counts are changed only by an owner-run trigger,
-- and history safeguards allow one change per record per transaction.

CREATE TYPE "enquiry_stage" AS ENUM (
  'new_enquiry', 'appraisal_booked', 'appraisal_completed',
  'won', 'lost', 'postponed'
);
CREATE TYPE "enquiry_list_item_status" AS ENUM ('active', 'hidden');
CREATE TYPE "enquiry_outcome_kind" AS ENUM ('lost', 'postponed', 'both');
CREATE TYPE "appraisal_status" AS ENUM (
  'scheduled', 'completed', 'cancelled', 'did_not_attend'
);
CREATE TYPE "letting_service_type" AS ENUM (
  'let_only', 'rent_collection', 'fully_managed'
);
CREATE TYPE "fee_kind" AS ENUM ('percentage', 'fixed');
CREATE TYPE "vat_treatment" AS ENUM ('inclusive', 'exclusive');
CREATE TYPE "enquiry_task_status" AS ENUM ('open', 'done', 'cancelled');

-- Per-agency lists. Starter entries are added by the application the first
-- time an agency uses them, inside that agency's own security context.
CREATE TABLE "lead_sources" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "name" varchar(80) NOT NULL,
  "status" "enquiry_list_item_status" NOT NULL DEFAULT 'active',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "lead_sources_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_sources_workspace_id_id_key" UNIQUE ("workspace_id", "id"),
  CONSTRAINT "lead_sources_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "lead_sources_name_check" CHECK (btrim("name") <> '')
);
CREATE UNIQUE INDEX "lead_sources_name_key"
ON "lead_sources"("workspace_id", lower(btrim("name")));

CREATE TABLE "enquiry_outcome_reasons" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "name" varchar(80) NOT NULL,
  "applies_to" "enquiry_outcome_kind" NOT NULL,
  "status" "enquiry_list_item_status" NOT NULL DEFAULT 'active',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "enquiry_outcome_reasons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enquiry_outcome_reasons_workspace_id_id_key"
    UNIQUE ("workspace_id", "id"),
  CONSTRAINT "enquiry_outcome_reasons_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "enquiry_outcome_reasons_name_check" CHECK (btrim("name") <> '')
);
CREATE UNIQUE INDEX "enquiry_outcome_reasons_name_key"
ON "enquiry_outcome_reasons"("workspace_id", "applies_to", lower(btrim("name")));

CREATE FUNCTION "public"."protect_enquiry_list_item"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW."id" <> OLD."id"
    OR NEW."workspace_id" <> OLD."workspace_id"
    OR NEW."created_at" <> OLD."created_at"
  THEN
    RAISE EXCEPTION 'list item identity cannot be changed'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "lead_sources_protect_identity"
BEFORE UPDATE ON "lead_sources"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_enquiry_list_item"();

-- A reason's outcome type is part of its meaning once enquiries use it.
CREATE FUNCTION "public"."protect_enquiry_outcome_reason"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW."id" <> OLD."id"
    OR NEW."workspace_id" <> OLD."workspace_id"
    OR NEW."applies_to" <> OLD."applies_to"
    OR NEW."created_at" <> OLD."created_at"
  THEN
    RAISE EXCEPTION 'outcome reason identity cannot be changed'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "enquiry_outcome_reasons_protect_identity"
BEFORE UPDATE ON "enquiry_outcome_reasons"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_enquiry_outcome_reason"();

CREATE TABLE "landlord_enquiries" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "reference" varchar(20) NOT NULL,
  "responsible_branch_id" uuid NOT NULL,
  "stage" "enquiry_stage" NOT NULL DEFAULT 'new_enquiry',
  "enquirer_name" varchar(200) NOT NULL,
  "enquirer_email" varchar(254),
  "enquirer_telephone" varchar(32),
  "address_building" varchar(160),
  "address_street" varchar(160),
  "postcode" varchar(8),
  "contact_id" uuid,
  "property_id" uuid,
  "lead_source_id" uuid,
  "lead_membership_id" uuid,
  "outcome_reason_id" uuid,
  "outcome_note" varchar(500),
  "follow_up_on" date,
  "summary" varchar(2000),
  "stage_changed_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_membership_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "landlord_enquiries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "landlord_enquiries_workspace_id_id_key"
    UNIQUE ("workspace_id", "id"),
  CONSTRAINT "landlord_enquiries_workspace_id_reference_key"
    UNIQUE ("workspace_id", "reference"),
  CONSTRAINT "landlord_enquiries_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "landlord_enquiries_branch_fkey"
    FOREIGN KEY ("workspace_id", "responsible_branch_id")
    REFERENCES "branches"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "landlord_enquiries_contact_fkey"
    FOREIGN KEY ("workspace_id", "contact_id")
    REFERENCES "contacts"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "landlord_enquiries_property_fkey"
    FOREIGN KEY ("workspace_id", "property_id")
    REFERENCES "properties"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "landlord_enquiries_lead_source_fkey"
    FOREIGN KEY ("workspace_id", "lead_source_id")
    REFERENCES "lead_sources"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "landlord_enquiries_lead_membership_fkey"
    FOREIGN KEY ("workspace_id", "lead_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "landlord_enquiries_outcome_reason_fkey"
    FOREIGN KEY ("workspace_id", "outcome_reason_id")
    REFERENCES "enquiry_outcome_reasons"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "landlord_enquiries_created_by_fkey"
    FOREIGN KEY ("workspace_id", "created_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "landlord_enquiries_reference_check" CHECK (
    "reference" ~ '^ENQ-[2-9A-HJ-NP-Z]{8}$'
  ),
  CONSTRAINT "landlord_enquiries_enquirer_check" CHECK (
    btrim("enquirer_name") <> ''
    AND ("enquirer_email" IS NULL OR btrim("enquirer_email") <> '')
    AND ("enquirer_telephone" IS NULL OR btrim("enquirer_telephone") <> '')
    AND (
      "contact_id" IS NOT NULL
      OR "enquirer_email" IS NOT NULL
      OR "enquirer_telephone" IS NOT NULL
    )
  ),
  CONSTRAINT "landlord_enquiries_address_check" CHECK (
    ("address_building" IS NULL OR btrim("address_building") <> '')
    AND ("address_street" IS NULL OR btrim("address_street") <> '')
    AND (
      "postcode" IS NULL
      OR "postcode" ~ '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$'
    )
    AND ("property_id" IS NOT NULL OR "postcode" IS NOT NULL)
  ),
  -- From appraisal booking onwards the real contact and property exist.
  CONSTRAINT "landlord_enquiries_records_check" CHECK (
    "stage" NOT IN ('appraisal_booked', 'appraisal_completed', 'won')
    OR ("contact_id" IS NOT NULL AND "property_id" IS NOT NULL)
  ),
  CONSTRAINT "landlord_enquiries_lead_source_check" CHECK (
    "stage" NOT IN ('appraisal_completed', 'won')
    OR "lead_source_id" IS NOT NULL
  ),
  CONSTRAINT "landlord_enquiries_outcome_check" CHECK (
    (
      "stage" IN ('lost', 'postponed')
      AND "outcome_reason_id" IS NOT NULL
      AND ("follow_up_on" IS NULL OR "stage" = 'postponed')
    ) OR (
      "stage" NOT IN ('lost', 'postponed')
      AND "outcome_reason_id" IS NULL
      AND "outcome_note" IS NULL
      AND "follow_up_on" IS NULL
    )
  ),
  CONSTRAINT "landlord_enquiries_text_check" CHECK (
    ("outcome_note" IS NULL OR btrim("outcome_note") <> '')
    AND ("summary" IS NULL OR btrim("summary") <> '')
  )
);

CREATE INDEX "landlord_enquiries_branch_stage_idx"
ON "landlord_enquiries"("workspace_id", "responsible_branch_id", "stage");
CREATE INDEX "landlord_enquiries_stage_updated_idx"
ON "landlord_enquiries"("workspace_id", "stage", "updated_at" DESC);
CREATE INDEX "landlord_enquiries_contact_idx"
ON "landlord_enquiries"("workspace_id", "contact_id");
CREATE INDEX "landlord_enquiries_property_idx"
ON "landlord_enquiries"("workspace_id", "property_id");
CREATE INDEX "landlord_enquiries_postcode_idx"
ON "landlord_enquiries"("workspace_id", "postcode");
CREATE INDEX "landlord_enquiries_lead_membership_idx"
ON "landlord_enquiries"("workspace_id", "lead_membership_id");
CREATE INDEX "landlord_enquiries_lead_source_idx"
ON "landlord_enquiries"("workspace_id", "lead_source_id");
CREATE INDEX "landlord_enquiries_outcome_reason_idx"
ON "landlord_enquiries"("workspace_id", "outcome_reason_id");
CREATE INDEX "landlord_enquiries_creator_idx"
ON "landlord_enquiries"("workspace_id", "created_by_membership_id");

CREATE TABLE "enquiry_stage_history" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "enquiry_id" uuid NOT NULL,
  "from_stage" "enquiry_stage" NOT NULL,
  "to_stage" "enquiry_stage" NOT NULL,
  "reason" varchar(500),
  "changed_by_membership_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "enquiry_stage_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enquiry_stage_history_workspace_id_id_key"
    UNIQUE ("workspace_id", "id"),
  CONSTRAINT "enquiry_stage_history_one_per_transaction"
    UNIQUE ("workspace_id", "enquiry_id", "created_at"),
  CONSTRAINT "enquiry_stage_history_enquiry_fkey"
    FOREIGN KEY ("workspace_id", "enquiry_id")
    REFERENCES "landlord_enquiries"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "enquiry_stage_history_actor_fkey"
    FOREIGN KEY ("workspace_id", "changed_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  -- A won enquiry is final: Chunk 6 builds the instruction on it.
  CONSTRAINT "enquiry_stage_history_change_check" CHECK (
    "from_stage" <> "to_stage" AND "from_stage" <> 'won'
  ),
  -- Closing an enquiry or moving it backwards always needs a reason.
  CONSTRAINT "enquiry_stage_history_reason_check" CHECK (
    ("reason" IS NULL OR char_length(btrim("reason")) BETWEEN 1 AND 500)
    AND (
      "reason" IS NOT NULL
      OR (
        "to_stage" NOT IN ('lost', 'postponed')
        AND (CASE "to_stage"
               WHEN 'new_enquiry' THEN 1 WHEN 'appraisal_booked' THEN 2
               WHEN 'appraisal_completed' THEN 3 WHEN 'won' THEN 4
               ELSE 5 END)
          > (CASE "from_stage"
               WHEN 'new_enquiry' THEN 1 WHEN 'appraisal_booked' THEN 2
               WHEN 'appraisal_completed' THEN 3 WHEN 'won' THEN 4
               ELSE 5 END)
      )
    )
  )
);
CREATE INDEX "enquiry_stage_history_actor_idx"
ON "enquiry_stage_history"("workspace_id", "changed_by_membership_id");

-- Identity never changes, a linked contact or property is never swapped for
-- another, and a stage change needs a history row written by the same actor
-- in the same transaction.
CREATE FUNCTION "public"."enforce_enquiry_rules"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW."id" <> OLD."id"
    OR NEW."workspace_id" <> OLD."workspace_id"
    OR NEW."reference" <> OLD."reference"
    OR NEW."responsible_branch_id" <> OLD."responsible_branch_id"
    OR NEW."created_by_membership_id" <> OLD."created_by_membership_id"
    OR NEW."created_at" <> OLD."created_at"
  THEN
    RAISE EXCEPTION 'immutable enquiry fields cannot be changed'
      USING ERRCODE = '23514';
  END IF;

  IF (OLD."contact_id" IS NOT NULL
      AND NEW."contact_id" IS DISTINCT FROM OLD."contact_id")
    OR (OLD."property_id" IS NOT NULL
      AND NEW."property_id" IS DISTINCT FROM OLD."property_id")
  THEN
    RAISE EXCEPTION 'a linked enquiry contact or property cannot be replaced'
      USING ERRCODE = '23514';
  END IF;

  IF OLD."stage" = 'won' AND NEW."stage" <> 'won' THEN
    RAISE EXCEPTION 'a won enquiry cannot be reopened'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."stage" <> OLD."stage" THEN
    IF NOT EXISTS (
      SELECT 1 FROM "enquiry_stage_history"
      WHERE "workspace_id" = NEW."workspace_id"
        AND "enquiry_id" = NEW."id"
        AND "from_stage" = OLD."stage"
        AND "to_stage" = NEW."stage"
        AND "changed_by_membership_id" =
          NULLIF(current_setting('app.membership_id', true), '')::uuid
        AND "created_at" = transaction_timestamp()
    ) THEN
      RAISE EXCEPTION 'enquiry stage changes require a history record'
        USING ERRCODE = '23514';
    END IF;
    NEW."stage_changed_at" := transaction_timestamp();
  ELSE
    NEW."stage_changed_at" := OLD."stage_changed_at";
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "landlord_enquiries_enforce_rules"
BEFORE UPDATE ON "landlord_enquiries"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_enquiry_rules"();

-- The stage time always comes from the database, so it can be used to match
-- a stage change to its history row.
CREATE FUNCTION "public"."stamp_new_enquiry"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  NEW."stage_changed_at" := transaction_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER "landlord_enquiries_stamp_new"
BEFORE INSERT ON "landlord_enquiries"
FOR EACH ROW EXECUTE FUNCTION "public"."stamp_new_enquiry"();

-- Checks every choice made on an enquiry when it is first made: the outcome
-- reason fits the outcome and is offered, the lead source is offered, and a
-- newly linked contact or property is visible to the actor and still active.
-- Choices already made are not re-checked, so a later change to a list or a
-- record's branch never locks staff out of their own enquiry.
CREATE FUNCTION "public"."validate_enquiry_choices"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  is_new boolean := TG_OP = 'INSERT';
  item_status "enquiry_list_item_status";
  item_kind "enquiry_outcome_kind";
BEGIN
  -- A list item from another agency is not found here and is refused by
  -- the foreign key instead.
  IF NEW."outcome_reason_id" IS NOT NULL AND (
    is_new
    OR NEW."outcome_reason_id" IS DISTINCT FROM OLD."outcome_reason_id"
    OR NEW."stage" <> OLD."stage"
  ) THEN
    SELECT "status", "applies_to" INTO item_status, item_kind
    FROM "enquiry_outcome_reasons"
    WHERE "workspace_id" = NEW."workspace_id"
      AND "id" = NEW."outcome_reason_id";
    IF FOUND AND (
      item_kind::text NOT IN ('both', NEW."stage"::text)
      OR (
        item_status <> 'active'
        AND (
          is_new
          OR NEW."outcome_reason_id" IS DISTINCT FROM OLD."outcome_reason_id"
        )
      )
    ) THEN
      RAISE EXCEPTION 'outcome reason is not offered for this outcome'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW."lead_source_id" IS NOT NULL AND (
    is_new OR NEW."lead_source_id" IS DISTINCT FROM OLD."lead_source_id"
  ) THEN
    SELECT "status" INTO item_status
    FROM "lead_sources"
    WHERE "workspace_id" = NEW."workspace_id"
      AND "id" = NEW."lead_source_id";
    IF FOUND AND item_status <> 'active' THEN
      RAISE EXCEPTION 'lead source is not offered'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW."contact_id" IS NOT NULL AND (
    is_new OR OLD."contact_id" IS NULL
  ) AND NOT EXISTS (
    SELECT 1 FROM "contacts"
    WHERE "workspace_id" = NEW."workspace_id"
      AND "id" = NEW."contact_id"
      AND "status" = 'active'
  ) THEN
    RAISE EXCEPTION 'enquiry contact must be an active contact you can see'
      USING ERRCODE = '42501';
  END IF;

  IF NEW."property_id" IS NOT NULL AND (
    is_new OR OLD."property_id" IS NULL
  ) AND NOT EXISTS (
    SELECT 1 FROM "properties"
    WHERE "workspace_id" = NEW."workspace_id"
      AND "id" = NEW."property_id"
      AND "status" = 'active'
  ) THEN
    RAISE EXCEPTION 'enquiry property must be an active property you can see'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "landlord_enquiries_validate_choices"
BEFORE INSERT OR UPDATE ON "landlord_enquiries"
FOR EACH ROW EXECUTE FUNCTION "public"."validate_enquiry_choices"();

-- A history row is kept only if this transaction really moved the enquiry to
-- that stage. Matching the stage time stops a row written while another
-- transaction made the same change from being credited to the wrong person.
CREATE FUNCTION "public"."enforce_enquiry_stage_applied"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "landlord_enquiries"
    WHERE "workspace_id" = NEW."workspace_id"
      AND "id" = NEW."enquiry_id"
      AND "stage" = NEW."to_stage"
      AND "stage_changed_at" = NEW."created_at"
  ) THEN
    RAISE EXCEPTION 'an enquiry stage record must match the enquiry'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "enquiry_stage_history_require_change"
AFTER INSERT ON "enquiry_stage_history"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_enquiry_stage_applied"();

CREATE TABLE "appraisals" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "enquiry_id" uuid NOT NULL,
  "scheduled_at" timestamptz(6) NOT NULL,
  "assigned_membership_id" uuid NOT NULL,
  "status" "appraisal_status" NOT NULL DEFAULT 'scheduled',
  "expected_monthly_rent_pence" integer,
  "recommended_service" "letting_service_type",
  "fee_kind" "fee_kind",
  "fee_value" integer,
  "fee_vat" "vat_treatment",
  "notes" varchar(2000),
  "completed_at" timestamptz(6),
  "created_by_membership_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "appraisals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "appraisals_workspace_id_id_key" UNIQUE ("workspace_id", "id"),
  CONSTRAINT "appraisals_workspace_enquiry_id_key"
    UNIQUE ("workspace_id", "enquiry_id", "id"),
  CONSTRAINT "appraisals_enquiry_fkey"
    FOREIGN KEY ("workspace_id", "enquiry_id")
    REFERENCES "landlord_enquiries"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "appraisals_assigned_fkey"
    FOREIGN KEY ("workspace_id", "assigned_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "appraisals_created_by_fkey"
    FOREIGN KEY ("workspace_id", "created_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "appraisals_rent_check" CHECK (
    "expected_monthly_rent_pence" IS NULL
    OR "expected_monthly_rent_pence" BETWEEN 1 AND 10000000
  ),
  -- Percentage fees are stored in basis points (1250 = 12.5%); fixed fees in
  -- pence.
  CONSTRAINT "appraisals_fee_check" CHECK (
    ("fee_kind" IS NULL AND "fee_value" IS NULL AND "fee_vat" IS NULL)
    OR (
      "fee_kind" = 'percentage' AND "fee_vat" IS NOT NULL
      AND "fee_value" BETWEEN 1 AND 10000
    )
    OR (
      "fee_kind" = 'fixed' AND "fee_vat" IS NOT NULL
      AND "fee_value" BETWEEN 1 AND 100000000
    )
  ),
  CONSTRAINT "appraisals_status_check" CHECK (
    ("status" = 'completed') = ("completed_at" IS NOT NULL)
  ),
  CONSTRAINT "appraisals_notes_check" CHECK (
    "notes" IS NULL OR btrim("notes") <> ''
  )
);
CREATE UNIQUE INDEX "appraisals_one_scheduled_per_enquiry"
ON "appraisals"("workspace_id", "enquiry_id")
WHERE "status" = 'scheduled';
CREATE INDEX "appraisals_enquiry_idx"
ON "appraisals"("workspace_id", "enquiry_id", "scheduled_at");
CREATE INDEX "appraisals_assigned_idx"
ON "appraisals"("workspace_id", "assigned_membership_id", "status", "scheduled_at");
CREATE INDEX "appraisals_creator_idx"
ON "appraisals"("workspace_id", "created_by_membership_id");

-- Identity is fixed, and an appraisal that is no longer scheduled is final.
CREATE FUNCTION "public"."enforce_appraisal_rules"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW."id" <> OLD."id"
    OR NEW."workspace_id" <> OLD."workspace_id"
    OR NEW."enquiry_id" <> OLD."enquiry_id"
    OR NEW."created_by_membership_id" <> OLD."created_by_membership_id"
    OR NEW."created_at" <> OLD."created_at"
  THEN
    RAISE EXCEPTION 'appraisal identity cannot be changed'
      USING ERRCODE = '23514';
  END IF;
  IF OLD."status" <> 'scheduled' THEN
    RAISE EXCEPTION 'a finished appraisal cannot be changed'
      USING ERRCODE = '23514';
  END IF;
  -- The completion time always comes from the database.
  IF NEW."status" = 'completed' THEN
    NEW."completed_at" := transaction_timestamp();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "appraisals_enforce_rules"
BEFORE UPDATE ON "appraisals"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_appraisal_rules"();

CREATE TABLE "enquiry_tasks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "enquiry_id" uuid NOT NULL,
  "appraisal_id" uuid,
  "title" varchar(200) NOT NULL,
  "due_on" date NOT NULL,
  "assigned_membership_id" uuid NOT NULL,
  "status" "enquiry_task_status" NOT NULL DEFAULT 'open',
  "closed_at" timestamptz(6),
  "closed_by_membership_id" uuid,
  "created_by_membership_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "enquiry_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "enquiry_tasks_workspace_id_id_key" UNIQUE ("workspace_id", "id"),
  CONSTRAINT "enquiry_tasks_enquiry_fkey"
    FOREIGN KEY ("workspace_id", "enquiry_id")
    REFERENCES "landlord_enquiries"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  -- An appraisal task must belong to an appraisal of the same enquiry.
  CONSTRAINT "enquiry_tasks_appraisal_fkey"
    FOREIGN KEY ("workspace_id", "enquiry_id", "appraisal_id")
    REFERENCES "appraisals"("workspace_id", "enquiry_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "enquiry_tasks_assigned_fkey"
    FOREIGN KEY ("workspace_id", "assigned_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "enquiry_tasks_closed_by_fkey"
    FOREIGN KEY ("workspace_id", "closed_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "enquiry_tasks_created_by_fkey"
    FOREIGN KEY ("workspace_id", "created_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "enquiry_tasks_title_check" CHECK (btrim("title") <> ''),
  CONSTRAINT "enquiry_tasks_status_check" CHECK (
    (
      "status" = 'open'
      AND "closed_at" IS NULL
      AND "closed_by_membership_id" IS NULL
    ) OR (
      "status" IN ('done', 'cancelled')
      AND "closed_at" IS NOT NULL
      AND "closed_by_membership_id" IS NOT NULL
    )
  )
);
CREATE INDEX "enquiry_tasks_enquiry_idx"
ON "enquiry_tasks"("workspace_id", "enquiry_id", "status", "due_on");
CREATE INDEX "enquiry_tasks_assigned_idx"
ON "enquiry_tasks"("workspace_id", "assigned_membership_id", "status", "due_on");
CREATE INDEX "enquiry_tasks_appraisal_idx"
ON "enquiry_tasks"("workspace_id", "enquiry_id", "appraisal_id");
CREATE INDEX "enquiry_tasks_closed_by_idx"
ON "enquiry_tasks"("workspace_id", "closed_by_membership_id");
CREATE INDEX "enquiry_tasks_creator_idx"
ON "enquiry_tasks"("workspace_id", "created_by_membership_id");

-- Identity is fixed, and a closed task stays closed.
CREATE FUNCTION "public"."enforce_enquiry_task_rules"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW."id" <> OLD."id"
    OR NEW."workspace_id" <> OLD."workspace_id"
    OR NEW."enquiry_id" <> OLD."enquiry_id"
    OR NEW."appraisal_id" IS DISTINCT FROM OLD."appraisal_id"
    OR NEW."created_by_membership_id" <> OLD."created_by_membership_id"
    OR NEW."created_at" <> OLD."created_at"
  THEN
    RAISE EXCEPTION 'task identity cannot be changed'
      USING ERRCODE = '23514';
  END IF;
  IF OLD."status" <> 'open' THEN
    RAISE EXCEPTION 'a closed task cannot be changed'
      USING ERRCODE = '23514';
  END IF;
  -- The closing time always comes from the database.
  IF NEW."status" <> 'open' THEN
    NEW."closed_at" := transaction_timestamp();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "enquiry_tasks_enforce_rules"
BEFORE UPDATE ON "enquiry_tasks"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_enquiry_task_rules"();

-- Contacts and properties with an open enquiry cannot be archived (agreed
-- rule). As for property ownership, the person archiving may not see the
-- enquiry, so a protected count is kept on each record.
ALTER TABLE "contacts"
ADD COLUMN "current_open_enquiry_count" integer NOT NULL DEFAULT 0,
ADD CONSTRAINT "contacts_open_enquiry_count_check" CHECK (
  "current_open_enquiry_count" >= 0
  AND ("status" = 'active' OR "current_open_enquiry_count" = 0)
);

ALTER TABLE "properties"
ADD COLUMN "current_open_enquiry_count" integer NOT NULL DEFAULT 0,
ADD CONSTRAINT "properties_open_enquiry_count_check" CHECK (
  "current_open_enquiry_count" >= 0
  AND ("status" = 'active' OR "current_open_enquiry_count" = 0)
);

-- Protected counts may only be changed by the owner-run (SECURITY DEFINER)
-- count triggers, so the role making the change must be their owner.
CREATE FUNCTION "public"."is_link_count_maintainer"()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT current_user = pg_get_userbyid(p.proowner)
  FROM pg_proc p
  WHERE p.oid = 'public.maintain_contact_ownership_count()'::regprocedure
$$;

CREATE OR REPLACE FUNCTION "public"."protect_contact_ownership_count"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND (
    NEW."current_property_ownership_count" <> 0
    OR NEW."current_open_enquiry_count" <> 0
  ) THEN
    RAISE EXCEPTION 'a new contact cannot start with linked records'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE'
    AND (
      NEW."current_property_ownership_count" <>
        OLD."current_property_ownership_count"
      OR NEW."current_open_enquiry_count" <> OLD."current_open_enquiry_count"
    )
    AND NOT "public"."is_link_count_maintainer"()
  THEN
    RAISE EXCEPTION 'linked record counts are maintained by the database'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER "contacts_protect_ownership_count" ON "contacts";
CREATE TRIGGER "contacts_protect_ownership_count"
BEFORE INSERT OR UPDATE OF
  "current_property_ownership_count", "current_open_enquiry_count"
ON "contacts"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_contact_ownership_count"();

CREATE FUNCTION "public"."protect_property_enquiry_count"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW."current_open_enquiry_count" <> 0 THEN
    RAISE EXCEPTION 'a new property cannot start with open enquiries'
      USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE'
    AND NEW."current_open_enquiry_count" <> OLD."current_open_enquiry_count"
    AND NOT "public"."is_link_count_maintainer"()
  THEN
    RAISE EXCEPTION 'open enquiry count is maintained by the database'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "properties_protect_enquiry_count"
BEFORE INSERT OR UPDATE OF "current_open_enquiry_count" ON "properties"
FOR EACH ROW EXECUTE FUNCTION "public"."protect_property_enquiry_count"();

CREATE FUNCTION "public"."maintain_enquiry_link_counts"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  new_open boolean := NEW."stage" IN (
    'new_enquiry', 'appraisal_booked', 'appraisal_completed'
  );
  old_open boolean := false;
  contact_delta integer;
  property_delta integer;
  updated_rows integer;
  saved_scope text := current_setting('app.membership_scope_mode', true);
BEGIN
  IF TG_OP = 'UPDATE' THEN
    old_open := OLD."stage" IN (
      'new_enquiry', 'appraisal_booked', 'appraisal_completed'
    );
  END IF;

  -- Links can only go from empty to set, so OLD and NEW never name
  -- different records.
  contact_delta :=
    (CASE WHEN new_open AND NEW."contact_id" IS NOT NULL THEN 1 ELSE 0 END)
    - (CASE WHEN TG_OP = 'UPDATE' AND old_open AND OLD."contact_id" IS NOT NULL
        THEN 1 ELSE 0 END);
  property_delta :=
    (CASE WHEN new_open AND NEW."property_id" IS NOT NULL THEN 1 ELSE 0 END)
    - (CASE WHEN TG_OP = 'UPDATE' AND old_open AND OLD."property_id" IS NOT NULL
        THEN 1 ELSE 0 END);

  IF contact_delta = 0 AND property_delta = 0 THEN
    RETURN NEW;
  END IF;

  -- The linked records may since have moved to a branch this user cannot
  -- update (for example after a property transfer). Closing or reopening
  -- their own enquiry must still keep the counts right, so the two count
  -- updates below run with agency-wide scope. They stay inside the user's
  -- agency, touch only the linked rows, and change only the counts.
  PERFORM set_config('app.membership_scope_mode', 'workspace', true);

  IF contact_delta <> 0 THEN
    UPDATE "contacts"
    SET "current_open_enquiry_count" =
      "current_open_enquiry_count" + contact_delta
    WHERE "workspace_id" = NEW."workspace_id" AND "id" = NEW."contact_id";
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    IF updated_rows <> 1 THEN
      RAISE EXCEPTION 'enquiry contact count could not be updated'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF property_delta <> 0 THEN
    UPDATE "properties"
    SET "current_open_enquiry_count" =
      "current_open_enquiry_count" + property_delta
    WHERE "workspace_id" = NEW."workspace_id" AND "id" = NEW."property_id";
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    IF updated_rows <> 1 THEN
      RAISE EXCEPTION 'enquiry property count could not be updated'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  PERFORM set_config(
    'app.membership_scope_mode', COALESCE(saved_scope, ''), true
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER "landlord_enquiries_maintain_link_counts"
AFTER INSERT OR UPDATE OF "stage", "contact_id", "property_id"
ON "landlord_enquiries"
FOR EACH ROW EXECUTE FUNCTION "public"."maintain_enquiry_link_counts"();

-- Review follow-up for property branch transfers: match a transfer record to
-- the move made in the same transaction, as for enquiry stage history.
ALTER TABLE "properties"
ADD COLUMN "branch_changed_at" timestamptz(6) NOT NULL
  DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION "public"."enforce_property_rules"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
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

  IF NEW."responsible_branch_id" <> OLD."responsible_branch_id" THEN
    IF NOT EXISTS (
      SELECT 1 FROM "property_branch_transfers"
      WHERE "workspace_id" = NEW."workspace_id"
        AND "property_id" = NEW."id"
        AND "from_branch_id" = OLD."responsible_branch_id"
        AND "to_branch_id" = NEW."responsible_branch_id"
        AND "transferred_by_membership_id" =
          NULLIF(current_setting('app.membership_id', true), '')::uuid
        AND "created_at" = transaction_timestamp()
    ) THEN
      RAISE EXCEPTION 'property branch changes require a transfer record'
        USING ERRCODE = '23514';
    END IF;
    NEW."branch_changed_at" := transaction_timestamp();
  ELSE
    NEW."branch_changed_at" := OLD."branch_changed_at";
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."enforce_property_transfer_applied"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "properties"
    WHERE "workspace_id" = NEW."workspace_id"
      AND "id" = NEW."property_id"
      AND "responsible_branch_id" = NEW."to_branch_id"
      AND "branch_changed_at" = NEW."created_at"
  ) THEN
    RAISE EXCEPTION 'a property transfer must move the property'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE "lead_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_sources" FORCE ROW LEVEL SECURITY;
ALTER TABLE "enquiry_outcome_reasons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enquiry_outcome_reasons" FORCE ROW LEVEL SECURITY;
ALTER TABLE "landlord_enquiries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "landlord_enquiries" FORCE ROW LEVEL SECURITY;
ALTER TABLE "enquiry_stage_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enquiry_stage_history" FORCE ROW LEVEL SECURITY;
ALTER TABLE "appraisals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appraisals" FORCE ROW LEVEL SECURITY;
ALTER TABLE "enquiry_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enquiry_tasks" FORCE ROW LEVEL SECURITY;

-- Lists are shared across the agency's branches.
CREATE POLICY "lead_source_select_in_workspace" ON "lead_sources"
FOR SELECT USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND NULLIF(current_setting('app.membership_id', true), '')::uuid IS NOT NULL
);
CREATE POLICY "lead_source_insert_in_workspace" ON "lead_sources"
FOR INSERT WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND NULLIF(current_setting('app.membership_id', true), '')::uuid IS NOT NULL
);
CREATE POLICY "lead_source_update_in_workspace" ON "lead_sources"
FOR UPDATE USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND NULLIF(current_setting('app.membership_id', true), '')::uuid IS NOT NULL
) WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "outcome_reason_select_in_workspace" ON "enquiry_outcome_reasons"
FOR SELECT USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND NULLIF(current_setting('app.membership_id', true), '')::uuid IS NOT NULL
);
CREATE POLICY "outcome_reason_insert_in_workspace" ON "enquiry_outcome_reasons"
FOR INSERT WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND NULLIF(current_setting('app.membership_id', true), '')::uuid IS NOT NULL
);
CREATE POLICY "outcome_reason_update_in_workspace" ON "enquiry_outcome_reasons"
FOR UPDATE USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND NULLIF(current_setting('app.membership_id', true), '')::uuid IS NOT NULL
) WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

-- An enquiry is visible to workspace-scoped members, or to members whose
-- named branches include its responsible branch.
CREATE POLICY "enquiry_select_in_scope" ON "landlord_enquiries"
FOR SELECT USING (
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

-- New enquiries start at the beginning, in the actor's branch, and may only
-- link records the actor can see.
CREATE POLICY "enquiry_insert_in_scope" ON "landlord_enquiries"
FOR INSERT WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "created_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
  AND "stage" = 'new_enquiry'
  AND (
    current_setting('app.membership_scope_mode', true) = 'workspace'
    OR "responsible_branch_id" = ANY(
      COALESCE(
        NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
        ARRAY[]::uuid[]
      )
    )
  )
  AND (
    "contact_id" IS NULL OR EXISTS (
      SELECT 1 FROM "contacts"
      WHERE "contacts"."workspace_id" = "landlord_enquiries"."workspace_id"
        AND "contacts"."id" = "landlord_enquiries"."contact_id"
    )
  )
  AND (
    "property_id" IS NULL OR EXISTS (
      SELECT 1 FROM "properties"
      WHERE "properties"."workspace_id" = "landlord_enquiries"."workspace_id"
        AND "properties"."id" = "landlord_enquiries"."property_id"
    )
  )
);

CREATE POLICY "enquiry_update_in_scope" ON "landlord_enquiries"
FOR UPDATE USING (
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
) WITH CHECK (
  -- Newly linked records are checked by validate_enquiry_choices; existing
  -- links are not re-checked, so staff are never locked out of an enquiry.
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "enquiry_stage_history_select_in_scope" ON "enquiry_stage_history"
FOR SELECT USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "landlord_enquiries"
    WHERE "landlord_enquiries"."workspace_id" = "enquiry_stage_history"."workspace_id"
      AND "landlord_enquiries"."id" = "enquiry_stage_history"."enquiry_id"
  )
);

-- A history row starts from the enquiry's current stage and is written by
-- the actor at the transaction's own time.
CREATE POLICY "enquiry_stage_history_insert_in_scope" ON "enquiry_stage_history"
FOR INSERT WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "changed_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
  AND "created_at" = CURRENT_TIMESTAMP
  AND EXISTS (
    SELECT 1 FROM "landlord_enquiries"
    WHERE "landlord_enquiries"."workspace_id" = "enquiry_stage_history"."workspace_id"
      AND "landlord_enquiries"."id" = "enquiry_stage_history"."enquiry_id"
      AND "landlord_enquiries"."stage" = "enquiry_stage_history"."from_stage"
  )
);

CREATE POLICY "appraisal_select_in_scope" ON "appraisals"
FOR SELECT USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "landlord_enquiries"
    WHERE "landlord_enquiries"."workspace_id" = "appraisals"."workspace_id"
      AND "landlord_enquiries"."id" = "appraisals"."enquiry_id"
  )
);
CREATE POLICY "appraisal_insert_in_scope" ON "appraisals"
FOR INSERT WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "created_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
  AND "status" = 'scheduled'
  AND EXISTS (
    SELECT 1 FROM "landlord_enquiries"
    WHERE "landlord_enquiries"."workspace_id" = "appraisals"."workspace_id"
      AND "landlord_enquiries"."id" = "appraisals"."enquiry_id"
  )
);
CREATE POLICY "appraisal_update_in_scope" ON "appraisals"
FOR UPDATE USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "landlord_enquiries"
    WHERE "landlord_enquiries"."workspace_id" = "appraisals"."workspace_id"
      AND "landlord_enquiries"."id" = "appraisals"."enquiry_id"
  )
) WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "enquiry_task_select_in_scope" ON "enquiry_tasks"
FOR SELECT USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "landlord_enquiries"
    WHERE "landlord_enquiries"."workspace_id" = "enquiry_tasks"."workspace_id"
      AND "landlord_enquiries"."id" = "enquiry_tasks"."enquiry_id"
  )
);
CREATE POLICY "enquiry_task_insert_in_scope" ON "enquiry_tasks"
FOR INSERT WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "created_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
  AND "status" = 'open'
  AND EXISTS (
    SELECT 1 FROM "landlord_enquiries"
    WHERE "landlord_enquiries"."workspace_id" = "enquiry_tasks"."workspace_id"
      AND "landlord_enquiries"."id" = "enquiry_tasks"."enquiry_id"
  )
);
-- Closing a task records the actor who closed it.
CREATE POLICY "enquiry_task_update_in_scope" ON "enquiry_tasks"
FOR UPDATE USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM "landlord_enquiries"
    WHERE "landlord_enquiries"."workspace_id" = "enquiry_tasks"."workspace_id"
      AND "landlord_enquiries"."id" = "enquiry_tasks"."enquiry_id"
  )
) WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND (
    "closed_by_membership_id" IS NULL
    OR "closed_by_membership_id" =
      NULLIF(current_setting('app.membership_id', true), '')::uuid
  )
);

GRANT SELECT, INSERT, UPDATE ON TABLE
  "lead_sources",
  "enquiry_outcome_reasons",
  "landlord_enquiries",
  "appraisals",
  "enquiry_tasks"
TO "zayto_app";
GRANT SELECT, INSERT ON TABLE "enquiry_stage_history" TO "zayto_app";

REVOKE DELETE ON TABLE
  "lead_sources",
  "enquiry_outcome_reasons",
  "landlord_enquiries",
  "enquiry_stage_history",
  "appraisals",
  "enquiry_tasks"
FROM "zayto_app";
REVOKE UPDATE ON TABLE "enquiry_stage_history" FROM "zayto_app";
