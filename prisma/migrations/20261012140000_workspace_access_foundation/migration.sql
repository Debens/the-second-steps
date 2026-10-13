-- CreateEnum
CREATE TYPE "identity_status" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "authentication_provider" AS ENUM ('supabase');

-- CreateEnum
CREATE TYPE "workspace_type" AS ENUM ('agency', 'landlord', 'platform_internal');

-- CreateEnum
CREATE TYPE "workspace_status" AS ENUM ('active', 'suspended', 'closed');

-- CreateEnum
CREATE TYPE "branch_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('active', 'suspended', 'ended');

-- CreateEnum
CREATE TYPE "membership_scope_mode" AS ENUM ('workspace', 'named_branches');

-- CreateEnum
CREATE TYPE "membership_role_code" AS ENUM ('workspace_owner', 'agency_admin', 'branch_manager', 'negotiator', 'property_manager', 'accounts', 'read_only');

-- CreateEnum
CREATE TYPE "platform_role_code" AS ENUM ('platform_owner');

-- CreateEnum
CREATE TYPE "platform_role_status" AS ENUM ('active', 'suspended', 'ended');

-- CreateEnum
CREATE TYPE "audit_outcome" AS ENUM ('succeeded', 'denied', 'failed');

-- CreateTable
CREATE TABLE "user_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" "identity_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authentication_provider_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_identity_id" UUID NOT NULL,
    "provider" "authentication_provider" NOT NULL,
    "provider_subject" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authentication_provider_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(63) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "type" "workspace_type" NOT NULL,
    "status" "workspace_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "status" "branch_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "user_identity_id" UUID NOT NULL,
    "status" "membership_status" NOT NULL DEFAULT 'active',
    "scope_mode" "membership_scope_mode" NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "role_code" "membership_role_code" NOT NULL,
    "assigned_by_user_identity_id" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_branch_access" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "assigned_by_user_identity_id" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_branch_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_role_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_identity_id" UUID NOT NULL,
    "role_code" "platform_role_code" NOT NULL,
    "status" "platform_role_status" NOT NULL DEFAULT 'active',
    "assigned_by_user_identity_id" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),

    CONSTRAINT "platform_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID,
    "actor_user_identity_id" UUID,
    "actor_membership_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "outcome" "audit_outcome" NOT NULL,
    "target_type" VARCHAR(80),
    "target_id" VARCHAR(160),
    "request_id" VARCHAR(160) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "authentication_provider_links_user_identity_id_idx" ON "authentication_provider_links"("user_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "authentication_provider_links_provider_provider_subject_key" ON "authentication_provider_links"("provider", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "branches_workspace_id_status_idx" ON "branches"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "branches_workspace_id_id_key" ON "branches"("workspace_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_workspace_id_name_key" ON "branches"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "memberships_user_identity_id_status_idx" ON "memberships"("user_identity_id", "status");

-- CreateIndex
CREATE INDEX "memberships_workspace_id_status_idx" ON "memberships"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_workspace_id_user_identity_id_key" ON "memberships"("workspace_id", "user_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_workspace_id_id_key" ON "memberships"("workspace_id", "id");

-- CreateIndex
CREATE INDEX "membership_roles_workspace_id_role_code_idx" ON "membership_roles"("workspace_id", "role_code");

-- CreateIndex
CREATE INDEX "membership_roles_assigned_by_user_identity_id_idx" ON "membership_roles"("assigned_by_user_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_roles_membership_id_role_code_key" ON "membership_roles"("membership_id", "role_code");

-- CreateIndex
CREATE INDEX "membership_branch_access_workspace_id_branch_id_idx" ON "membership_branch_access"("workspace_id", "branch_id");

-- CreateIndex
CREATE INDEX "membership_branch_access_assigned_by_user_identity_id_idx" ON "membership_branch_access"("assigned_by_user_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_branch_access_membership_id_branch_id_key" ON "membership_branch_access"("membership_id", "branch_id");

-- CreateIndex
CREATE INDEX "platform_role_assignments_status_role_code_idx" ON "platform_role_assignments"("status", "role_code");

-- CreateIndex
CREATE INDEX "platform_role_assignments_assigned_by_user_identity_id_idx" ON "platform_role_assignments"("assigned_by_user_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_role_assignments_user_identity_id_role_code_key" ON "platform_role_assignments"("user_identity_id", "role_code");

-- CreateIndex
CREATE INDEX "audit_events_workspace_id_created_at_idx" ON "audit_events"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_user_identity_id_created_at_idx" ON "audit_events"("actor_user_identity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_membership_id_idx" ON "audit_events"("actor_membership_id");

-- CreateIndex
CREATE INDEX "audit_events_action_created_at_idx" ON "audit_events"("action", "created_at");

-- AddForeignKey
ALTER TABLE "authentication_provider_links" ADD CONSTRAINT "authentication_provider_links_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_workspace_id_membership_id_fkey" FOREIGN KEY ("workspace_id", "membership_id") REFERENCES "memberships"("workspace_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_assigned_by_user_identity_id_fkey" FOREIGN KEY ("assigned_by_user_identity_id") REFERENCES "user_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_branch_access" ADD CONSTRAINT "membership_branch_access_workspace_id_membership_id_fkey" FOREIGN KEY ("workspace_id", "membership_id") REFERENCES "memberships"("workspace_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_branch_access" ADD CONSTRAINT "membership_branch_access_workspace_id_branch_id_fkey" FOREIGN KEY ("workspace_id", "branch_id") REFERENCES "branches"("workspace_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_branch_access" ADD CONSTRAINT "membership_branch_access_assigned_by_user_identity_id_fkey" FOREIGN KEY ("assigned_by_user_identity_id") REFERENCES "user_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_role_assignments" ADD CONSTRAINT "platform_role_assignments_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_role_assignments" ADD CONSTRAINT "platform_role_assignments_assigned_by_user_identity_id_fkey" FOREIGN KEY ("assigned_by_user_identity_id") REFERENCES "user_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_identity_id_fkey" FOREIGN KEY ("actor_user_identity_id") REFERENCES "user_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_membership_id_fkey" FOREIGN KEY ("actor_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Explicit lifecycle checks keep status and end timestamps consistent.
ALTER TABLE "memberships"
ADD CONSTRAINT "memberships_ended_at_check"
CHECK (
  ("status" = 'ended' AND "ended_at" IS NOT NULL)
  OR ("status" <> 'ended' AND "ended_at" IS NULL)
);

ALTER TABLE "platform_role_assignments"
ADD CONSTRAINT "platform_role_assignments_ended_at_check"
CHECK (
  ("status" = 'ended' AND "ended_at" IS NOT NULL)
  OR ("status" <> 'ended' AND "ended_at" IS NULL)
);

ALTER TABLE "workspaces"
ADD CONSTRAINT "workspaces_slug_format_check"
CHECK ("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

-- Read Only is an exclusive role. It cannot be combined with a write-capable role.
CREATE FUNCTION "public"."enforce_read_only_role_exclusivity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."role_code" = 'read_only' AND EXISTS (
    SELECT 1
    FROM "membership_roles"
    WHERE "membership_id" = NEW."membership_id"
      AND "id" <> NEW."id"
  ) THEN
    RAISE EXCEPTION 'read_only must be the only role on a membership';
  END IF;

  IF NEW."role_code" <> 'read_only' AND EXISTS (
    SELECT 1
    FROM "membership_roles"
    WHERE "membership_id" = NEW."membership_id"
      AND "role_code" = 'read_only'
      AND "id" <> NEW."id"
  ) THEN
    RAISE EXCEPTION 'read_only must be the only role on a membership';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "membership_roles_read_only_exclusivity"
BEFORE INSERT OR UPDATE OF "membership_id", "role_code"
ON "membership_roles"
FOR EACH ROW
EXECUTE FUNCTION "public"."enforce_read_only_role_exclusivity"();

-- Workspace-owned rows are always constrained to the server-verified workspace
-- context. NULL or missing context denies access. The application still performs
-- the entitlement, permission, resource, and field checks required by ADR-021.
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspaces" FORCE ROW LEVEL SECURITY;
ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branches" FORCE ROW LEVEL SECURITY;
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
ALTER TABLE "membership_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_roles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "membership_branch_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_branch_access" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" FORCE ROW LEVEL SECURITY;

-- Global identity/access tables are also protected so a missing request context
-- does not expose the identity directory or internal platform assignments.
ALTER TABLE "user_identities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_identities" FORCE ROW LEVEL SECURITY;
ALTER TABLE "authentication_provider_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "authentication_provider_links" FORCE ROW LEVEL SECURITY;
ALTER TABLE "platform_role_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_role_assignments" FORCE ROW LEVEL SECURITY;

CREATE POLICY "user_identity_select_self"
ON "user_identities"
FOR SELECT
USING (
  "id" = NULLIF(current_setting('app.user_identity_id', true), '')::uuid
);

CREATE POLICY "user_identity_insert_during_verified_provisioning"
ON "user_identities"
FOR INSERT
WITH CHECK (
  NULLIF(current_setting('app.auth_subject', true), '') IS NOT NULL
  AND current_setting('app.identity_provisioning', true) = 'true'
);

CREATE POLICY "provider_link_select_self"
ON "authentication_provider_links"
FOR SELECT
USING (
  "provider_subject" = NULLIF(current_setting('app.auth_subject', true), '')::uuid
  OR "user_identity_id" = NULLIF(current_setting('app.user_identity_id', true), '')::uuid
);

CREATE POLICY "provider_link_insert_during_verified_provisioning"
ON "authentication_provider_links"
FOR INSERT
WITH CHECK (
  "provider_subject" = NULLIF(current_setting('app.auth_subject', true), '')::uuid
  AND current_setting('app.identity_provisioning', true) = 'true'
);

CREATE POLICY "platform_role_select_context"
ON "platform_role_assignments"
FOR SELECT
USING (
  "user_identity_id" = NULLIF(current_setting('app.user_identity_id', true), '')::uuid
  OR current_setting('app.platform_owner', true) = 'true'
);

CREATE POLICY "platform_role_insert_by_platform_owner"
ON "platform_role_assignments"
FOR INSERT
WITH CHECK (current_setting('app.platform_owner', true) = 'true');

CREATE POLICY "platform_role_update_by_platform_owner"
ON "platform_role_assignments"
FOR UPDATE
USING (current_setting('app.platform_owner', true) = 'true')
WITH CHECK (current_setting('app.platform_owner', true) = 'true');

CREATE POLICY "workspace_select_authorised"
ON "workspaces"
FOR SELECT
USING (
  "id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  OR current_setting('app.platform_owner', true) = 'true'
  OR EXISTS (
    SELECT 1
    FROM "memberships"
    WHERE "memberships"."workspace_id" = "workspaces"."id"
      AND "memberships"."user_identity_id" = NULLIF(current_setting('app.user_identity_id', true), '')::uuid
      AND "memberships"."status" = 'active'
  )
);

CREATE POLICY "workspace_insert_by_platform_owner"
ON "workspaces"
FOR INSERT
WITH CHECK (current_setting('app.platform_owner', true) = 'true');

CREATE POLICY "workspace_update_in_context"
ON "workspaces"
FOR UPDATE
USING (
  "id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  OR current_setting('app.platform_owner', true) = 'true'
)
WITH CHECK (
  "id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  OR current_setting('app.platform_owner', true) = 'true'
);

CREATE POLICY "branch_select_in_workspace"
ON "branches"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "branch_insert_in_workspace"
ON "branches"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "branch_update_in_workspace"
ON "branches"
FOR UPDATE
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
)
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "membership_select_self_or_workspace"
ON "memberships"
FOR SELECT
USING (
  "user_identity_id" = NULLIF(current_setting('app.user_identity_id', true), '')::uuid
  OR "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "membership_insert_in_workspace"
ON "memberships"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  OR current_setting('app.platform_owner', true) = 'true'
);

CREATE POLICY "membership_update_in_workspace"
ON "memberships"
FOR UPDATE
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
)
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "membership_role_select_in_workspace"
ON "membership_roles"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "membership_role_insert_in_workspace"
ON "membership_roles"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "membership_role_update_in_workspace"
ON "membership_roles"
FOR UPDATE
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
)
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "membership_role_delete_in_workspace"
ON "membership_roles"
FOR DELETE
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "branch_access_select_in_workspace"
ON "membership_branch_access"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "branch_access_insert_in_workspace"
ON "membership_branch_access"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "branch_access_delete_in_workspace"
ON "membership_branch_access"
FOR DELETE
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
);

CREATE POLICY "audit_select_in_workspace_or_platform"
ON "audit_events"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  OR ("workspace_id" IS NULL AND current_setting('app.platform_owner', true) = 'true')
);

CREATE POLICY "audit_insert_in_workspace_or_platform"
ON "audit_events"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  OR ("workspace_id" IS NULL AND current_setting('app.platform_owner', true) = 'true')
);
