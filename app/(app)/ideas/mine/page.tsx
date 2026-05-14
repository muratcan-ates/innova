/*
 * app/(app)/ideas/mine/page.tsx
 * ====================================================================
 * What this file is: the /ideas/mine route — a Submitter's view of
 *   the ideas THEY have submitted. Sorted newest first.
 *
 * Why it exists: spec US-4 + FR-011. Submitter-only — an Evaluator
 *   hitting this route is redirected by `requireRole`.
 *
 * The query uses the (submitterId, createdAt) compound index from
 * the Prisma schema (T014) — the lookup is single-digit ms even
 * if a Submitter has dozens of ideas, which they won't at MVP scale.
 *
 * Read by: Next.js — mapped to `/ideas/mine`.
 * ====================================================================
 */

import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { MyIdeasList } from "@/components/my-ideas-list";

/*
 * MyIdeasPage
 * --------------------------------------------------------------------
 * Inputs: none (server component).
 * Outputs: section heading + MyIdeasList rendered against the
 *   current user's ideas.
 * Callers: Next.js (route mapping).
 */
export default async function MyIdeasPage() {
  const user = await requireRole("SUBMITTER");

  const ideas = await prisma.idea.findMany({
    where: { submitterId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        My ideas
      </h1>
      <MyIdeasList ideas={ideas} />
    </section>
  );
}
