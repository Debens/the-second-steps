-- Migration history is operator metadata, not application data. A broad
-- runtime-table grant in the preceding hardening migration must not expose it.
REVOKE ALL ON TABLE "public"."_prisma_migrations" FROM "zayto_app";
