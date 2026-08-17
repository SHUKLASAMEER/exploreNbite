import { PrismaClient } from "@prisma/client";

// Next.js dev mode hot-reloads modules on every file change, which would
// otherwise create a new PrismaClient (and a new DB connection pool) on
// every request. Caching the instance on `globalThis` keeps a single
// client alive across reloads. In production each server instance still
// only ever creates one client, so the cache is harmless there too.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
