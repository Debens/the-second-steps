-- Independent review follow-up for properties and ownership.

-- 1. A session that can create temporary tables or functions must not be able
--    to shadow the real tables a trigger reads. Pin the search path of every
--    function we own so the public schema is always used and the temporary
--    schema is searched last.
DO $$
DECLARE
  routine record;
BEGIN
  FOR routine IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND pg_get_userbyid(p.proowner) = current_user
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = pg_catalog, public, pg_temp',
      routine.signature
    );
  END LOOP;
END
$$;

-- 2. One transfer record per property per transaction, and a record is kept
--    only if the property really ended up in the branch it names.
ALTER TABLE "property_branch_transfers"
ADD CONSTRAINT "property_branch_transfers_one_per_transaction"
UNIQUE ("workspace_id", "property_id", "created_at");

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
  ) THEN
    RAISE EXCEPTION 'a property transfer must move the property'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. The ownership count may only be changed by the ownership trigger below.
--    That trigger runs as the function owner (a different role from the
--    connected session), which a session cannot imitate, unlike trigger depth.
CREATE OR REPLACE FUNCTION "public"."protect_contact_ownership_count"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW."current_property_ownership_count" <> 0 THEN
    RAISE EXCEPTION 'a new contact cannot start with property ownerships'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW."current_property_ownership_count" <>
      OLD."current_property_ownership_count"
    AND current_user = session_user
  THEN
    RAISE EXCEPTION 'property ownership count is maintained by the database'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."maintain_contact_ownership_count"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
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

    -- Row security still applies to this update, so a contact the user
    -- cannot update is refused rather than leaving the count wrong.
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    IF updated_rows <> 1 THEN
      RAISE EXCEPTION 'property owner contact is not available to this user'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
