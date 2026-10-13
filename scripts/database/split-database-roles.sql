\set ON_ERROR_STOP on

\if :{?migration_password}
\else
  \prompt -s 'New zayto_migrator password: ' migration_password
\endif

-- Run once as the Supabase postgres administrator. The password is supplied as
-- a hidden prompt and must never be saved in this repository.
BEGIN;

SELECT format(
  'CREATE ROLE zayto_migrator LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
  :'migration_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'zayto_migrator')
\gexec

ALTER ROLE zayto_migrator PASSWORD :'migration_password';

-- Supabase's managed postgres role is deliberately not a true superuser, so it
-- cannot explicitly alter the protected SUPERUSER, REPLICATION, or BYPASSRLS
-- attributes. Verify those safe values, then alter only permitted attributes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname IN ('zayto_app', 'zayto_migrator')
      AND (rolsuper OR rolreplication OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'Zayto database roles have unsafe protected attributes';
  END IF;
END;
$$;

ALTER ROLE zayto_migrator
  WITH LOGIN NOCREATEDB NOCREATEROLE NOINHERIT;
ALTER ROLE zayto_app
  WITH LOGIN NOCREATEDB NOCREATEROLE NOINHERIT;

-- PostgreSQL requires the operator to be able to SET ROLE to a new owner.
-- Supabase's managed postgres role does not receive that membership implicitly,
-- so grant it only for this transaction and revoke it again before commit.
GRANT zayto_migrator TO postgres;

GRANT CONNECT ON DATABASE postgres TO zayto_migrator, zayto_app;
GRANT USAGE, CREATE ON SCHEMA public TO zayto_migrator;
GRANT USAGE ON SCHEMA public TO zayto_app;
REVOKE CREATE ON SCHEMA public FROM zayto_app;

SELECT format('ALTER TABLE public.%I OWNER TO zayto_migrator', tablename)
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    '_prisma_migrations',
    'user_identities',
    'authentication_provider_links',
    'workspaces',
    'branches',
    'memberships',
    'membership_roles',
    'membership_branch_access',
    'platform_role_assignments',
    'audit_events',
    'feature_flags',
    'workspace_feature_flag_overrides'
  )
\gexec

SELECT format('ALTER TYPE public.%I OWNER TO zayto_migrator', typname)
FROM pg_type
INNER JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
WHERE pg_namespace.nspname = 'public'
  AND typname IN (
    'identity_status',
    'authentication_provider',
    'workspace_type',
    'workspace_status',
    'branch_status',
    'membership_status',
    'membership_scope_mode',
    'membership_role_code',
    'platform_role_code',
    'platform_role_status',
    'audit_outcome',
    'feature_flag_status'
  )
\gexec

SELECT format(
  'ALTER FUNCTION public.%I(%s) OWNER TO zayto_migrator',
  routine_name,
  identity_arguments
)
FROM information_schema.routines
CROSS JOIN LATERAL (
  SELECT pg_get_function_identity_arguments(pg_proc.oid) AS identity_arguments
  FROM pg_proc
  INNER JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
  WHERE pg_namespace.nspname = 'public'
    AND pg_proc.proname = information_schema.routines.routine_name
  LIMIT 1
) arguments
WHERE routine_schema = 'public'
  AND routine_name IN (
    'enforce_read_only_role_exclusivity',
    'enforce_membership_branch_scope',
    'workspace_has_active_owner',
    'enforce_new_workspace_owner',
    'protect_last_workspace_owner_role',
    'protect_last_workspace_owner_membership'
  )
\gexec

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO zayto_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO zayto_app;
REVOKE ALL ON TABLE public._prisma_migrations FROM zayto_app;

ALTER DEFAULT PRIVILEGES FOR ROLE zayto_migrator IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO zayto_app;
ALTER DEFAULT PRIVILEGES FOR ROLE zayto_migrator IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO zayto_app;

REVOKE zayto_migrator FROM postgres;

COMMIT;

-- The operator should verify the final report before changing application URLs.
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
FROM pg_roles
WHERE rolname IN ('zayto_app', 'zayto_migrator')
ORDER BY rolname;

SELECT tableowner, array_agg(tablename ORDER BY tablename) AS tables
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    '_prisma_migrations',
    'user_identities',
    'authentication_provider_links',
    'workspaces',
    'branches',
    'memberships',
    'membership_roles',
    'membership_branch_access',
    'platform_role_assignments',
    'audit_events',
    'feature_flags',
    'workspace_feature_flag_overrides'
  )
GROUP BY tableowner
ORDER BY tableowner;
