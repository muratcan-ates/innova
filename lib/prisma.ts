/*
 * lib/prisma.ts
 * ====================================================================
 * What this file is: the single, shared PrismaClient instance for the
 *   whole app.
 *
 * Why it exists: Next.js dev mode hot-reloads server modules on every
 *   file save. If we wrote `new PrismaClient()` at module top level
 *   without protection, each reload would spawn another client +
 *   connection pool, eventually exhausting SQLite's connection
 *   limits and surfacing as random "database is locked" errors
 *   during the demo.
 *
 *   The canonical fix is the `globalForPrisma` pattern: store the
 *   client on `globalThis` in dev so reloads find and reuse the
 *   same instance; create a fresh client only in production where
 *   the process doesn't hot-reload.
 *
 * Read by: every Server Action, every API route, lib/auth-helpers.ts,
 *   prisma/seed.ts — anywhere that needs to read or write the DB.
 *
 * Callers MUST import `prisma` from this file. NEVER instantiate
 * a new PrismaClient elsewhere.
 * ====================================================================
 */

import { PrismaClient } from "@prisma/client";

/*
 * In dev, Next.js hot-reload re-executes this module on every file
 * save. We stash the client on globalThis under a typed key so the
 * second/third/Nth reload finds the existing instance instead of
 * making a new one. In prod, this whole dance is unnecessary
 * (the process doesn't hot-reload) so we skip the cache.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Log query/error/warn lines to the terminal. The constitution
    // (Principle IV) forbids log libraries; plain console output is
    // exactly what we want for an operator-facing terminal demo.
    log: ["error", "warn"],
  });

// Stash on globalThis only in dev. In prod (NODE_ENV === "production")
// we deliberately leave globalForPrisma.prisma undefined so each
// serverless invocation gets a fresh client. For Innova specifically
// we are always running `next dev` or `next start` on localhost, but
// this branch keeps the file future-proof for any deploy target.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
