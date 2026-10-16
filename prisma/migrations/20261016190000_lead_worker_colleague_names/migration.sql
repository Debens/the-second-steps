-- Owner decision (2026-10-16, Chunk 5 checkpoint): staff who work landlord
-- leads (Negotiator and Property Manager, as well as the roles already
-- listed) can see the names of colleagues who share a branch with them, so
-- they can hand leads, appraisals and next actions to each other. As before,
-- only identities with a membership visible in the current workspace and a
-- shared branch (or workspace-wide scope on either side) are visible, and
-- authentication-provider links stay hidden. Screens that list staff remain
-- gated by their own permissions in the application.
DROP POLICY "user_identity_select_visible_workspace_member" ON "user_identities";

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
            'negotiator',
            'property_manager',
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
