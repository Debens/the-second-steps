-- Human names use explicit first-name and last-name fields. Each field may
-- contain multiple words and punctuation; no token-based name parsing occurs.
ALTER TABLE "user_identities"
ADD COLUMN "first_name" VARCHAR(100),
ADD COLUMN "last_name" VARCHAR(100);

-- The shared environment contains only these documented fictional personas.
-- Map them explicitly rather than guessing how to split an arbitrary full name.
UPDATE "user_identities"
SET "first_name" = CASE "primary_email"
      WHEN 'owner@zayto.local' THEN 'Olivia'
      WHEN 'platform.owner@zayto.local' THEN 'Theo'
      WHEN 'dual.owner@zayto.local' THEN 'Maya'
      WHEN 'no.access@zayto.local' THEN 'Noah'
    END,
    "last_name" = CASE "primary_email"
      WHEN 'owner@zayto.local' THEN 'Hart'
      WHEN 'platform.owner@zayto.local' THEN 'Grant'
      WHEN 'dual.owner@zayto.local' THEN 'Ellis'
      WHEN 'no.access@zayto.local' THEN 'Reed'
    END
WHERE "primary_email" IN (
  'owner@zayto.local',
  'platform.owner@zayto.local',
  'dual.owner@zayto.local',
  'no.access@zayto.local'
);

-- Refuse to discard an unexpected populated name. Such a row needs an explicit,
-- reviewed mapping rather than an unsafe first-word/last-word assumption.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "user_identities"
    WHERE "display_name" IS NOT NULL
      AND ("first_name" IS NULL OR "last_name" IS NULL)
  ) THEN
    RAISE EXCEPTION 'unmapped display_name found; review before migrating';
  END IF;
END;
$$;

DROP INDEX "user_identities_display_name_idx";
ALTER TABLE "user_identities" DROP COLUMN "display_name";

CREATE INDEX "user_identities_first_name_idx" ON "user_identities"("first_name");
CREATE INDEX "user_identities_last_name_idx" ON "user_identities"("last_name");
