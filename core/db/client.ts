import { PrismaPg } from "@prisma/adapter-pg";
import { databaseSsl, databaseUrl } from "./connection";
import { PrismaClient } from "./generated/client";

declare global {
  var prismaClient: PrismaClient | undefined;
}

function createClient() {
  const adapter = new PrismaPg({
    connectionString: databaseUrl(),
    ssl: databaseSsl(),
  });
  return new PrismaClient({ adapter });
}

// Reused across hot reloads in development so we don't open a new pool each save.
export const db = globalThis.prismaClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = db;
}
