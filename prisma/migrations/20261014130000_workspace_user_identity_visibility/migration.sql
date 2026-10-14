-- Let staff-directory readers see the identity details of memberships already
-- visible within their current workspace and branch scope. This does not expose
-- authentication-provider links or identities from another workspace.
CREATE POLICY "user_identity_select_visible_workspace_member"
ON "user_identities"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "memberships" AS "target_membership"
    INNER JOIN "memberships" AS "actor_membership"
      ON "actor_membership"."workspace_id" = "target_membership"."workspace_id"
    WHERE "target_membership"."user_identity_id" = "user_identities"."id"
      AND "target_membership"."workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
      AND "actor_membership"."user_identity_id" = NULLIF(current_setting('app.user_identity_id', true), '')::uuid
      AND "actor_membership"."status" = 'active'
      AND EXISTS (
        SELECT 1
        FROM "membership_roles" AS "actor_role"
        WHERE "actor_role"."membership_id" = "actor_membership"."id"
          AND "actor_role"."workspace_id" = "actor_membership"."workspace_id"
          AND "actor_role"."role_code" IN (
            'workspace_owner',
            'agency_admin',
            'branch_manager',
            'read_only'
          )
      )
      AND (
        "actor_membership"."scope_mode" = 'workspace'
        OR "target_membership"."scope_mode" = 'workspace'
        OR EXISTS (
          SELECT 1
          FROM "membership_branch_access" AS "actor_branch"
          INNER JOIN "membership_branch_access" AS "target_branch"
            ON "target_branch"."workspace_id" = "actor_branch"."workspace_id"
           AND "target_branch"."branch_id" = "actor_branch"."branch_id"
          WHERE "actor_branch"."workspace_id" = "actor_membership"."workspace_id"
            AND "actor_branch"."membership_id" = "actor_membership"."id"
            AND "target_branch"."membership_id" = "target_membership"."id"
        )
      )
  )
);
