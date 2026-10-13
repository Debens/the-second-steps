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

export function databaseSslMode() {
  const mode = process.env.DATABASE_SSL_MODE ?? "verify-full";
  if (mode !== "verify-full" && mode !== "disable") {
    throw new Error(
      'DATABASE_SSL_MODE must be either "verify-full" or "disable".',
    );
  }
  if (mode === "disable" && process.env.NODE_ENV === "production") {
    throw new Error("Database TLS cannot be disabled in production.");
  }
  return mode;
}

export function databaseSsl() {
  if (databaseSslMode() === "disable") return false;

  return {
    ca: readFileSync(DATABASE_CA_PATH, "utf8"),
    rejectUnauthorized: true,
  };
}
