-- CreateEnum
CREATE TYPE "feature_flag_status" AS ENUM ('active', 'retired');

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(80) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "global_enabled" BOOLEAN NOT NULL DEFAULT false,
    "zayto_users_enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "feature_flag_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_feature_flag_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "feature_flag_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "changed_by_user_identity_id" UUID,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_feature_flag_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_status_idx" ON "feature_flags"("status");

-- CreateIndex
CREATE INDEX "workspace_feature_flag_overrides_feature_flag_id_idx" ON "workspace_feature_flag_overrides"("feature_flag_id");

-- CreateIndex
CREATE INDEX "workspace_feature_flag_overrides_changed_by_user_identity_i_idx" ON "workspace_feature_flag_overrides"("changed_by_user_identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_feature_flag_overrides_workspace_id_feature_flag__key" ON "workspace_feature_flag_overrides"("workspace_id", "feature_flag_id");

-- AddForeignKey
ALTER TABLE "workspace_feature_flag_overrides" ADD CONSTRAINT "workspace_feature_flag_overrides_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_feature_flag_overrides" ADD CONSTRAINT "workspace_feature_flag_overrides_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_feature_flag_overrides" ADD CONSTRAINT "workspace_feature_flag_overrides_changed_by_user_identity__fkey" FOREIGN KEY ("changed_by_user_identity_id") REFERENCES "user_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Install the first code-owned flag disabled for every audience. This happens
-- before RLS is forced so deployment does not need a request identity context.
INSERT INTO "feature_flags" (
    "key",
    "display_name",
    "description",
    "global_enabled",
    "zayto_users_enabled",
    "updated_at"
) VALUES (
    'staff_mfa',
    'Staff two-step verification',
    'Require an authenticator-app code before staff enter customer or Zayto platform areas.',
    false,
    false,
    CURRENT_TIMESTAMP
);

-- Feature definitions are global platform configuration. Verified identities
-- may read active definitions for server-side evaluation; only Platform Owners
-- may change them.
ALTER TABLE "feature_flags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feature_flags" FORCE ROW LEVEL SECURITY;

CREATE POLICY "feature_flag_select_for_verified_identity"
ON "feature_flags"
FOR SELECT
USING (
  NULLIF(current_setting('app.user_identity_id', true), '') IS NOT NULL
);

CREATE POLICY "feature_flag_insert_by_platform_owner"
ON "feature_flags"
FOR INSERT
WITH CHECK (current_setting('app.platform_owner', true) = 'true');

CREATE POLICY "feature_flag_update_by_platform_owner"
ON "feature_flags"
FOR UPDATE
USING (current_setting('app.platform_owner', true) = 'true')
WITH CHECK (current_setting('app.platform_owner', true) = 'true');

-- Workspace overrides are visible only in the verified workspace context, or
-- to a Platform Owner administering rollout. Customer workspace roles cannot
-- create or change overrides.
ALTER TABLE "workspace_feature_flag_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_feature_flag_overrides" FORCE ROW LEVEL SECURITY;

CREATE POLICY "workspace_feature_flag_select_in_context"
ON "workspace_feature_flag_overrides"
FOR SELECT
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  OR current_setting('app.platform_owner', true) = 'true'
);

CREATE POLICY "workspace_feature_flag_insert_by_platform_owner"
ON "workspace_feature_flag_overrides"
FOR INSERT
WITH CHECK (current_setting('app.platform_owner', true) = 'true');

CREATE POLICY "workspace_feature_flag_update_by_platform_owner"
ON "workspace_feature_flag_overrides"
FOR UPDATE
USING (current_setting('app.platform_owner', true) = 'true')
WITH CHECK (current_setting('app.platform_owner', true) = 'true');

CREATE POLICY "workspace_feature_flag_delete_by_platform_owner"
ON "workspace_feature_flag_overrides"
FOR DELETE
USING (current_setting('app.platform_owner', true) = 'true');

-- Preserve the existing audit rules and additionally let a verified identity
-- record a denied global administration attempt against itself. This cannot be
-- used to record a successful platform action or impersonate another actor.
DROP POLICY "audit_insert_in_workspace_or_platform" ON "audit_events";

CREATE POLICY "audit_insert_in_workspace_or_platform"
ON "audit_events"
FOR INSERT
WITH CHECK (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  OR ("workspace_id" IS NULL AND current_setting('app.platform_owner', true) = 'true')
  OR (
    "workspace_id" IS NULL
    AND "actor_user_identity_id" = NULLIF(current_setting('app.user_identity_id', true), '')::uuid
    AND "outcome" = 'denied'
  )
);
