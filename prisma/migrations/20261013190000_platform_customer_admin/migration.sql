-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "address_1" VARCHAR(160),
ADD COLUMN     "address_2" VARCHAR(160),
ADD COLUMN     "county" VARCHAR(100),
ADD COLUMN     "email" VARCHAR(254),
ADD COLUMN     "postcode" VARCHAR(16),
ADD COLUMN     "telephone" VARCHAR(32),
ADD COLUMN     "town_city" VARCHAR(100);

-- AlterTable
ALTER TABLE "user_identities" ADD COLUMN     "display_name" VARCHAR(160),
ADD COLUMN     "primary_email" VARCHAR(254);

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "company_number" VARCHAR(8),
ADD COLUMN     "legal_name" VARCHAR(160),
ADD COLUMN     "primary_email" VARCHAR(254),
ADD COLUMN     "registered_address_1" VARCHAR(160),
ADD COLUMN     "registered_address_2" VARCHAR(160),
ADD COLUMN     "registered_county" VARCHAR(100),
ADD COLUMN     "registered_postcode" VARCHAR(16),
ADD COLUMN     "registered_town_city" VARCHAR(100),
ADD COLUMN     "telephone" VARCHAR(32),
ADD COLUMN     "website" VARCHAR(2048);

-- CreateIndex
CREATE INDEX "user_identities_display_name_idx" ON "user_identities"("display_name");

-- CreateIndex
CREATE INDEX "user_identities_primary_email_idx" ON "user_identities"("primary_email");

-- Platform Owners may read only the identity and access metadata used by the
-- internal user directory. This does not grant customer product-record access.
ALTER POLICY "user_identity_select_self"
ON "user_identities"
USING (
  "id" = NULLIF(current_setting('app.user_identity_id', true), '')::uuid
  OR current_setting('app.platform_owner', true) = 'true'
);

-- A verified development login may keep its own fictional directory profile
-- in sync. Arbitrary authenticated identities never receive this context.
CREATE POLICY "user_identity_update_during_verified_provisioning"
ON "user_identities"
FOR UPDATE
USING (
  "id" = NULLIF(current_setting('app.user_identity_id', true), '')::uuid
  AND current_setting('app.identity_provisioning', true) = 'true'
)
WITH CHECK (
  "id" = NULLIF(current_setting('app.user_identity_id', true), '')::uuid
  AND current_setting('app.identity_provisioning', true) = 'true'
);

-- Customer administration exposes account metadata, branches and membership
-- summaries to Platform Owners. It does not create a customer workspace
-- context or grant access to future CRM records.
ALTER POLICY "branch_select_in_workspace"
ON "branches"
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  OR current_setting('app.platform_owner', true) = 'true'
);

ALTER POLICY "membership_select_self_or_workspace"
ON "memberships"
USING (
  "user_identity_id" = NULLIF(current_setting('app.user_identity_id', true), '')::uuid
  OR "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  OR current_setting('app.platform_owner', true) = 'true'
);

ALTER POLICY "membership_role_select_in_workspace"
ON "membership_roles"
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  OR current_setting('app.platform_owner', true) = 'true'
);
