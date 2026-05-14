/*
 * lib/auth-helpers.ts
 * ====================================================================
 * What this file is: three helpers that wrap `auth()` from
 *   `auth.ts` with the gating rules Server Actions and server
 *   components actually want:
 *     - `getSessionUser()`  → SessionUser | null (no throw)
 *     - `requireUser()`     → SessionUser (throws redirect on miss)
 *     - `requireRole(role)` → SessionUser (throws redirect on miss
 *                              or role mismatch)
 *
 * Why it exists: every Server Action in Innova starts with the same
 *   two checks (session present, role matches). Centralizing them
 *   keeps the actions tight and means a future tweak to the rule
 *   (say, locking out a "suspended" user) only edits this file.
 *
 * Read by: every server action under `server/actions/*`, every
 *   server component that needs the session, and
 *   `tests/unit/auth-helpers.test.ts`.
 * ====================================================================
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";

import type { UserRole } from "@/types/next-auth.d.ts";

/* The slice of the Auth.js session we actually use. Keep this type
 * narrow on purpose so callers don't accidentally lean on fields
 * Auth.js might rename across minor versions (e.g. `expires`). */
export type SessionUser = {
  id: string;
  email: string;
  name: string | null | undefined;
  role: UserRole;
};

/*
 * getSessionUser
 * --------------------------------------------------------------------
 * Inputs: none.
 * Outputs: a SessionUser when there's an active Auth.js session,
 *   null otherwise. NEVER throws.
 * Callers: anywhere that wants to branch on "signed in or not"
 *   without redirecting (e.g. the public landing page conditionally
 *   rendering a "Sign In" vs "Open Dashboard" CTA).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: session.user.role,
  };
}

/*
 * requireUser
 * --------------------------------------------------------------------
 * Inputs: none.
 * Outputs: a SessionUser. If no session is active the function
 *   throws via `redirect("/login")` and never returns to the
 *   caller, so the return type is just SessionUser.
 * Callers: every Server Action and every protected server
 *   component that needs an authenticated user.
 *
 * Note: `redirect()` in Next.js throws a special internal error
 * that the framework catches and turns into an HTTP redirect.
 * That's why the function can claim a non-null return type after
 * calling it.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/*
 * requireRole
 * --------------------------------------------------------------------
 * Inputs: role — the exact role the caller is gating on.
 * Outputs: a SessionUser whose role matches. Redirects to /login
 *   if there's no session, and to /dashboard if the session exists
 *   but the role is wrong (the user IS authenticated, they're just
 *   not authorized for THIS surface).
 * Callers: role-scoped Server Actions (e.g. `submitIdea` requires
 *   SUBMITTER; `evaluateIdea` requires EVALUATOR) and role-scoped
 *   server components (e.g. /ideas page requires EVALUATOR).
 */
export async function requireRole(role: UserRole): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) {
    // Redirect to the user's own dashboard rather than 403'ing.
    // FR-014 says "Submitters must not see" not "must see an error".
    redirect("/dashboard");
  }
  return user;
}
