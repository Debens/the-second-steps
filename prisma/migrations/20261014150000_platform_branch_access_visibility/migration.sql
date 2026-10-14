-- Platform customer administration already exposes workspace memberships,
-- roles and branches to verified Platform Owners. Include the join records
-- needed to present each membership's named branch scope without granting
-- write access or access to customer product data.
ALTER POLICY "branch_access_select_in_workspace"
ON "membership_branch_access"
USING (
  "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
  OR current_setting('app.platform_owner', true) = 'true'
);
