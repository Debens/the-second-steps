import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";
import { DATABASE_CA_PATH, databaseSslMode } from "./core/db/connection";

loadEnvConfig(process.cwd());

function migrationUrl(value: string) {
  const url = new URL(value);
  if (databaseSslMode() === "disable") {
    url.searchParams.set("sslmode", "disable");
  } else {
    url.searchParams.set("sslmode", "require");
    url.searchParams.set("sslcert", DATABASE_CA_PATH);
    url.searchParams.set("sslaccept", "strict");
  }
  return url.toString();
}

const configuredMigrationUrl =
  process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Generating the client needs no database, so a missing URL only fails commands that connect.
  datasource: configuredMigrationUrl
    ? { url: migrationUrl(configuredMigrationUrl) }
    : undefined,
});
