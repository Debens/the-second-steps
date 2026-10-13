-- An audit actor membership must belong to the same workspace as the event.
ALTER TABLE "audit_events"
DROP CONSTRAINT "audit_events_actor_membership_id_fkey";

ALTER TABLE "audit_events"
ADD CONSTRAINT "audit_events_workspace_id_actor_membership_id_fkey"
FOREIGN KEY ("workspace_id", "actor_membership_id")
REFERENCES "memberships"("workspace_id", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- A named-branch membership must have at least one branch at transaction end.
CREATE FUNCTION "public"."enforce_membership_branch_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  affected_membership_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'memberships' THEN
    affected_membership_id := COALESCE(NEW."id", OLD."id");
  ELSE
    affected_membership_id := COALESCE(NEW."membership_id", OLD."membership_id");
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "memberships"
    WHERE "id" = affected_membership_id
      AND "scope_mode" = 'named_branches'
  ) AND NOT EXISTS (
    SELECT 1
    FROM "membership_branch_access"
    WHERE "membership_id" = affected_membership_id
  ) THEN
    RAISE EXCEPTION 'named_branches membership requires at least one branch'
      USING ERRCODE = '23514';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE CONSTRAINT TRIGGER "memberships_branch_scope_required"
AFTER INSERT OR UPDATE OF "scope_mode" ON "memberships"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_membership_branch_scope"();

CREATE CONSTRAINT TRIGGER "membership_branch_access_scope_required"
AFTER DELETE OR UPDATE OF "membership_id" ON "membership_branch_access"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_membership_branch_scope"();

-- Application role changes take the matching transaction advisory lock before
-- they inspect owner counts. These triggers also reject a direct mutation that
-- would leave an ordinary transaction with no active Account Owner.
CREATE FUNCTION "public"."workspace_has_active_owner"(candidate_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "memberships"
    INNER JOIN "membership_roles"
      ON "membership_roles"."membership_id" = "memberships"."id"
     AND "membership_roles"."workspace_id" = "memberships"."workspace_id"
    WHERE "memberships"."workspace_id" = candidate_workspace_id
      AND "memberships"."status" = 'active'
      AND "membership_roles"."role_code" = 'workspace_owner'
  );
$$;

CREATE FUNCTION "public"."enforce_new_workspace_owner"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT "public"."workspace_has_active_owner"(NEW."id") THEN
    RAISE EXCEPTION 'workspace must have an active workspace_owner'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "workspaces_require_owner"
AFTER INSERT ON "workspaces"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_new_workspace_owner"();

CREATE FUNCTION "public"."protect_last_workspace_owner_role"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."role_code" = 'workspace_owner' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(OLD."workspace_id"::text, 0));
    IF NOT "public"."workspace_has_active_owner"(OLD."workspace_id") THEN
      RAISE EXCEPTION 'workspace must retain an active workspace_owner'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER "membership_roles_protect_last_owner"
AFTER DELETE OR UPDATE OF "workspace_id", "membership_id", "role_code"
ON "membership_roles"
FOR EACH ROW
EXECUTE FUNCTION "public"."protect_last_workspace_owner_role"();

CREATE FUNCTION "public"."protect_last_workspace_owner_membership"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."status" = 'active'
    AND (TG_OP = 'DELETE' OR NEW."status" <> 'active')
    AND EXISTS (
      SELECT 1
      FROM "membership_roles"
      WHERE "membership_id" = OLD."id"
        AND "workspace_id" = OLD."workspace_id"
        AND "role_code" = 'workspace_owner'
    )
  THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(OLD."workspace_id"::text, 0));
    IF NOT EXISTS (
      SELECT 1
      FROM "memberships"
      INNER JOIN "membership_roles"
        ON "membership_roles"."membership_id" = "memberships"."id"
       AND "membership_roles"."workspace_id" = "memberships"."workspace_id"
      WHERE "memberships"."workspace_id" = OLD."workspace_id"
        AND "memberships"."id" <> OLD."id"
        AND "memberships"."status" = 'active'
        AND "membership_roles"."role_code" = 'workspace_owner'
    ) THEN
      RAISE EXCEPTION 'workspace must retain an active workspace_owner'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER "memberships_protect_last_owner"
BEFORE DELETE OR UPDATE OF "status", "workspace_id"
ON "memberships"
FOR EACH ROW
EXECUTE FUNCTION "public"."protect_last_workspace_owner_membership"();

-- The application login receives data access only. Object ownership and schema
-- changes belong to the separately configured migration login.
REVOKE CREATE ON SCHEMA "public" FROM "zayto_app";
GRANT USAGE ON SCHEMA "public" TO "zayto_app";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO "zayto_app";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO "zayto_app";

ALTER DEFAULT PRIVILEGES IN SCHEMA "public"
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "zayto_app";

ALTER DEFAULT PRIVILEGES IN SCHEMA "public"
GRANT USAGE, SELECT ON SEQUENCES TO "zayto_app";
