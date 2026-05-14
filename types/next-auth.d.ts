/*
 * types/next-auth.d.ts
 * ====================================================================
 * What this file is: TypeScript module augmentation that teaches
 *   next-auth's built-in `Session` and `User` types about Innova's
 *   two extra fields — `id` (always copied from the DB) and
 *   `role` (`"SUBMITTER"` or `"EVALUATOR"`).
 *
 * Why it exists: without this file, `session.user.role` is
 *   `undefined` at the type level, and TypeScript can't help us
 *   catch role-gating typos (`"EVALUTAOR"`, `"submitter"`, etc.).
 *   With it, every place that reads `session.user.role` is
 *   type-checked end-to-end.
 *
 * Read by: TypeScript itself — this file is picked up automatically
 *   because tsconfig.json's `include` patterns cover all .ts files.
 *   No runtime code imports from here.
 * ====================================================================
 */

import { type DefaultSession } from "next-auth";

/* The full set of role values. Mirrors the Prisma `Role` enum so
 * a typo here would surface as a TS error against either side. */
export type UserRole = "SUBMITTER" | "EVALUATOR";

/* Augment the `next-auth` module so its `Session` and `User`
 * interfaces gain the two extra fields. */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
  }
}

/* Augment the JWT module so token.id and token.role are typed. */
declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
  }
}
