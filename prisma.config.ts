import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";
import { DATABASE_CA_PATH, databaseUrl } from "./core/db/connection";

loadEnvConfig(process.cwd());

function migrationUrl() {
  const url = new URL(databaseUrl());
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("sslcert", DATABASE_CA_PATH);
  url.searchParams.set("sslaccept", "strict");
  return url.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Generating the client needs no database, so a missing URL only fails commands that connect.
  datasource: process.env.DATABASE_URL ? { url: migrationUrl() } : undefined,
});
