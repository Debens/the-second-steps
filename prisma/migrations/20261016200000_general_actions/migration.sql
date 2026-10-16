-- Dashboard D1: general actions (to-dos not tied to a landlord lead), and a
-- planned start time so actions and lead next actions can be planned into
-- the day. Follows the 2026-10-16 security reviews: every function pins its
-- search path, links are checked when first made and never swapped, closing
-- times come from the database, and the app role cannot delete.
--
-- Owner decisions (2026-10-16): every role except Read Only may add actions
-- and change any action in a branch they can see; an action is visible to its
-- assignee and creator, and to anyone whose branch scope includes its branch.
-- After the independent review: someone outside the action's branch (an
-- assignee who has lost access) may only finish, cancel or hand it over; a
-- creator outside the branch can see it but not change it; whoever last
-- handed an action over keeps seeing it.

CREATE TYPE "action_kind" AS ENUM ('call', 'email', 'send', 'chase', 'other');
CREATE TYPE "action_status" AS ENUM ('open', 'done', 'cancelled');

CREATE TABLE "actions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL,
  "responsible_branch_id" uuid NOT NULL,
  "title" varchar(200) NOT NULL,
  "kind" "action_kind" NOT NULL DEFAULT 'other',
  "due_on" date NOT NULL,
  "planned_for" timestamptz(6),
  "assigned_membership_id" uuid NOT NULL,
  "contact_id" uuid,
  "property_id" uuid,
  "status" "action_status" NOT NULL DEFAULT 'open',
  "closed_at" timestamptz(6),
  "closed_by_membership_id" uuid,
  -- Set by the database to whoever last changed the assignee.
  "handed_over_by_membership_id" uuid,
  "created_by_membership_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  CONSTRAINT "actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "actions_workspace_id_id_key" UNIQUE ("workspace_id", "id"),
  CONSTRAINT "actions_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "actions_branch_fkey"
    FOREIGN KEY ("workspace_id", "responsible_branch_id")
    REFERENCES "branches"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "actions_assigned_fkey"
    FOREIGN KEY ("workspace_id", "assigned_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "actions_contact_fkey"
    FOREIGN KEY ("workspace_id", "contact_id")
    REFERENCES "contacts"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "actions_property_fkey"
    FOREIGN KEY ("workspace_id", "property_id")
    REFERENCES "properties"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "actions_closed_by_fkey"
    FOREIGN KEY ("workspace_id", "closed_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "actions_handed_over_by_fkey"
    FOREIGN KEY ("workspace_id", "handed_over_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "actions_created_by_fkey"
    FOREIGN KEY ("workspace_id", "created_by_membership_id")
    REFERENCES "memberships"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "actions_title_check" CHECK (btrim("title") <> ''),
  CONSTRAINT "actions_status_check" CHECK (
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

CREATE INDEX "actions_assigned_idx"
ON "actions"("workspace_id", "assigned_membership_id", "status", "due_on");
CREATE INDEX "actions_branch_idx"
ON "actions"("workspace_id", "responsible_branch_id", "status", "due_on");
CREATE INDEX "actions_creator_idx"
ON "actions"("workspace_id", "created_by_membership_id");
CREATE INDEX "actions_contact_idx"
ON "actions"("workspace_id", "contact_id");
CREATE INDEX "actions_property_idx"
ON "actions"("workspace_id", "property_id");
CREATE INDEX "actions_handed_over_by_idx"
ON "actions"("workspace_id", "handed_over_by_membership_id");
CREATE INDEX "actions_closed_by_idx"
ON "actions"("workspace_id", "closed_by_membership_id");

-- True when a member of the current workspace is active, holds a role other
-- than Read Only, and (if a branch is given) can see that branch. Runs as the
-- caller, so it only ever sees the caller's own workspace.
CREATE FUNCTION "public"."action_member_can_work"(
  "member" uuid,
  "branch" uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "memberships" AS m
    WHERE m."id" = "member"
      AND m."workspace_id" =
        NULLIF(current_setting('app.workspace_id', true), '')::uuid
      AND m."status" = 'active'
      AND EXISTS (
        SELECT 1 FROM "membership_roles" AS r
        WHERE r."workspace_id" = m."workspace_id"
          AND r."membership_id" = m."id"
          AND r."role_code" <> 'read_only'
      )
      AND (
        "branch" IS NULL
        OR m."scope_mode" = 'workspace'
        OR EXISTS (
          SELECT 1 FROM "membership_branch_access" AS b
          WHERE b."workspace_id" = m."workspace_id"
            AND b."membership_id" = m."id"
            AND b."branch_id" = "branch"
        )
      )
  )
$$;

-- Identity and branch are fixed, a closed action stays closed, links are
-- checked when first made and never swapped, the assignee must be able to
-- work on the action, and closing times come from the database.
CREATE FUNCTION "public"."enforce_action_rules"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  is_new boolean := TG_OP = 'INSERT';
BEGIN
  IF NOT is_new THEN
    IF NEW."id" <> OLD."id"
      OR NEW."workspace_id" <> OLD."workspace_id"
      OR NEW."responsible_branch_id" <> OLD."responsible_branch_id"
      OR NEW."created_by_membership_id" <> OLD."created_by_membership_id"
      OR NEW."created_at" <> OLD."created_at"
    THEN
      RAISE EXCEPTION 'action identity cannot be changed'
        USING ERRCODE = '23514';
    END IF;
    IF OLD."status" <> 'open' THEN
      RAISE EXCEPTION 'a closed action cannot be changed'
        USING ERRCODE = '23514';
    END IF;
    IF (OLD."contact_id" IS NOT NULL
        AND NEW."contact_id" IS DISTINCT FROM OLD."contact_id")
      OR (OLD."property_id" IS NOT NULL
        AND NEW."property_id" IS DISTINCT FROM OLD."property_id")
    THEN
      RAISE EXCEPTION 'a linked action contact or property cannot be replaced'
        USING ERRCODE = '23514';
    END IF;
    -- Outside the action's branch (an assignee who has lost access), the only
    -- changes allowed are finishing, cancelling and handing it over.
    IF NOT (
      current_setting('app.membership_scope_mode', true) = 'workspace'
      OR OLD."responsible_branch_id" = ANY(
        COALESCE(
          NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
          ARRAY[]::uuid[]
        )
      )
    ) AND (
      NEW."title" IS DISTINCT FROM OLD."title"
      OR NEW."kind" IS DISTINCT FROM OLD."kind"
      OR NEW."due_on" IS DISTINCT FROM OLD."due_on"
      OR NEW."planned_for" IS DISTINCT FROM OLD."planned_for"
      OR NEW."contact_id" IS DISTINCT FROM OLD."contact_id"
      OR NEW."property_id" IS DISTINCT FROM OLD."property_id"
    ) THEN
      RAISE EXCEPTION 'outside its branch an action can only be finished or handed over'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Who handed it over always comes from the database.
  IF is_new THEN
    NEW."handed_over_by_membership_id" := NULL;
  ELSIF NEW."assigned_membership_id" <> OLD."assigned_membership_id" THEN
    NEW."handed_over_by_membership_id" :=
      NULLIF(current_setting('app.membership_id', true), '')::uuid;
  ELSE
    NEW."handed_over_by_membership_id" := OLD."handed_over_by_membership_id";
  END IF;

  IF (is_new OR NEW."assigned_membership_id" <> OLD."assigned_membership_id")
    AND NOT "public"."action_member_can_work"(
      NEW."assigned_membership_id", NEW."responsible_branch_id"
    )
  THEN
    RAISE EXCEPTION 'the assignee cannot work on this action'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."contact_id" IS NOT NULL AND (is_new OR OLD."contact_id" IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM "contacts"
      WHERE "workspace_id" = NEW."workspace_id"
        AND "id" = NEW."contact_id"
        AND "status" = 'active'
    )
  THEN
    RAISE EXCEPTION 'action contact must be an active contact you can see'
      USING ERRCODE = '42501';
  END IF;

  IF NEW."property_id" IS NOT NULL AND (is_new OR OLD."property_id" IS NULL)
    AND NOT EXISTS (
      SELECT 1 FROM "properties"
      WHERE "workspace_id" = NEW."workspace_id"
        AND "id" = NEW."property_id"
        AND "status" = 'active'
    )
  THEN
    RAISE EXCEPTION 'action property must be an active property you can see'
      USING ERRCODE = '42501';
  END IF;

  IF NEW."status" <> 'open' THEN
    NEW."closed_at" := transaction_timestamp();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "actions_enforce_rules"
BEFORE INSERT OR UPDATE ON "actions"
FOR EACH ROW EXECUTE FUNCTION "public"."enforce_action_rules"();

ALTER TABLE "actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "actions" FORCE ROW LEVEL SECURITY;

-- Visible to its assignee, its creator and whoever last handed it over, and
-- to anyone whose branch scope includes the action's branch.
CREATE POLICY "action_select_in_scope" ON "actions"
FOR SELECT USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND (
    "assigned_membership_id" =
      NULLIF(current_setting('app.membership_id', true), '')::uuid
    OR "created_by_membership_id" =
      NULLIF(current_setting('app.membership_id', true), '')::uuid
    OR "handed_over_by_membership_id" =
      NULLIF(current_setting('app.membership_id', true), '')::uuid
    OR current_setting('app.membership_scope_mode', true) = 'workspace'
    OR "responsible_branch_id" = ANY(
      COALESCE(
        NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
        ARRAY[]::uuid[]
      )
    )
  )
);

-- New actions start open, are created by the actor, and sit in a branch the
-- actor can work in.
CREATE POLICY "action_insert_in_scope" ON "actions"
FOR INSERT WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "created_by_membership_id" =
    NULLIF(current_setting('app.membership_id', true), '')::uuid
  AND "status" = 'open'
  AND "public"."action_member_can_work"(
    NULLIF(current_setting('app.membership_id', true), '')::uuid,
    "responsible_branch_id"
  )
);

-- An action in the actor's branch scope, or assigned to the actor, may be
-- changed by an active member who is not Read Only (outside the branch it
-- can only be finished or handed over: see enforce_action_rules). A creator
-- outside the branch can see it but not change it. Closing records the actor.
CREATE POLICY "action_update_in_scope" ON "actions"
FOR UPDATE USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND (
    "assigned_membership_id" =
      NULLIF(current_setting('app.membership_id', true), '')::uuid
    OR current_setting('app.membership_scope_mode', true) = 'workspace'
    OR "responsible_branch_id" = ANY(
      COALESCE(
        NULLIF(current_setting('app.allowed_branch_ids', true), '')::uuid[],
        ARRAY[]::uuid[]
      )
    )
  )
) WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  AND "public"."action_member_can_work"(
    NULLIF(current_setting('app.membership_id', true), '')::uuid,
    NULL
  )
  AND (
    "closed_by_membership_id" IS NULL
    OR "closed_by_membership_id" =
      NULLIF(current_setting('app.membership_id', true), '')::uuid
  )
);

GRANT SELECT, INSERT, UPDATE ON TABLE "actions" TO "zayto_app";
REVOKE DELETE ON TABLE "actions" FROM "zayto_app";

-- Lead next actions can be planned into the day too.
ALTER TABLE "enquiry_tasks" ADD COLUMN "planned_for" timestamptz(6);
