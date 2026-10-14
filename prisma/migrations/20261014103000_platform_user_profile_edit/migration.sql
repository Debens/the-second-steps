-- Platform Owners may update the limited account fields exposed by the
-- server-authorised user-management application service. RLS establishes the
-- actor boundary; the service validates and audits each permitted field.
CREATE POLICY "user_identity_update_by_platform_owner"
ON "user_identities"
FOR UPDATE
USING (
  current_setting('app.platform_owner', true) = 'true'
)
WITH CHECK (
  current_setting('app.platform_owner', true) = 'true'
);
