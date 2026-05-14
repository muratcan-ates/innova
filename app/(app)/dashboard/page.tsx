/*
 * app/(app)/dashboard/page.tsx
 * ====================================================================
 * What this file is: the Dashboard route — the default landing page
 *   after sign-in for both Submitters and Evaluators.
 *
 * THIS IS A STUB. Task T053 (Phase 10) replaces it with the real
 * stat-card implementation per FR-026a. We need a stub now so that:
 *   - US-1's registration redirect (T034) has a valid /dashboard
 *     target.
 *   - US-2's login flow has the same.
 *   - The (app) layout has at least one page to wrap during
 *     manual verification.
 *
 * Read by: Next.js — mapped to `/dashboard`.
 * ====================================================================
 */

import { requireUser } from "@/lib/auth-helpers";

/*
 * DashboardStubPage
 * --------------------------------------------------------------------
 * Inputs: none (server component).
 * Outputs: a welcome line. Replaced in T053 with real stat cards.
 * Callers: Next.js (route mapping).
 */
export default async function DashboardStubPage() {
  // requireUser is also enforced by the (app) layout, but we call
  // it here too so the page can read the user's name + role.
  const user = await requireUser();

  return (
    <section className="space-y-3">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Welcome, {user.name ?? user.email}.
      </h1>
      <p className="text-muted-foreground">
        You are signed in as a{" "}
        <span className="font-mono">{user.role}</span>. The full
        dashboard (stat cards + recent activity) lands in T053.
      </p>
    </section>
  );
}
