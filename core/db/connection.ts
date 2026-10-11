import { readFileSync } from "node:fs";
import path from "node:path";

export const DATABASE_CA_PATH = path.join(
  process.cwd(),
  "certs",
  "supabase-ca.crt",
);

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }
  return url;
}

export function databaseSsl() {
  return {
    ca: readFileSync(DATABASE_CA_PATH, "utf8"),
    rejectUnauthorized: true,
  };
}
