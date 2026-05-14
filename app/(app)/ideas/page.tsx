/*
 * app/(app)/ideas/page.tsx
 * ====================================================================
 * What this file is: the /ideas route — the Evaluator's view of
 *   every idea in the system. Submitter-blocked.
 *
 * Why it exists: spec US-5 + FR-012 + FR-013. Evaluators need a
 *   single page where every idea is visible with the submitter's
 *   name, status, category, and submission date — sortable +
 *   filterable.
 *
 * Read by: Next.js — mapped to `/ideas`.
 * ====================================================================
 */

import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { IdeasDataTable, type IdeaRow } from "@/components/ideas-data-table";

/*
 * AllIdeasPage
 * --------------------------------------------------------------------
 * Inputs: none (server component).
 * Outputs: section heading + IdeasDataTable. The data fetch
 *   `select`s only the fields the table renders, keeping the
 *   payload tight even if the DB grows.
 * Callers: Next.js (route mapping).
 */
export default async function AllIdeasPage() {
  await requireRole("EVALUATOR");

  // Fetch all ideas with the submitter's name. orderBy here is the
  // initial sort; the data-table re-sorts client-side based on user
  // interaction.
  const ideas = await prisma.idea.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      createdAt: true,
      submitter: { select: { name: true } },
    },
  });

  // Shape into the IdeaRow type the table expects.
  const rows: IdeaRow[] = ideas.map((i) => ({
    id: i.id,
    title: i.title,
    category: i.category,
    status: i.status,
    createdAt: i.createdAt,
    submitterName: i.submitter.name,
  }));

  return (
    <section className="space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        All ideas
      </h1>
      <IdeasDataTable rows={rows} />
    </section>
  );
}
