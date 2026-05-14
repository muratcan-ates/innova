/*
 * app/(app)/dashboard/page.tsx
 * ====================================================================
 * What this file is: the Dashboard route — the default landing page
 *   after sign-in for both roles.
 *
 * Why it exists: spec FR-026a — Submitter sees four status stat
 *   cards (counts of THEIR OWN ideas) + a total card; Evaluator
 *   sees four status stat cards (counts of ALL ideas) + a total
 *   card + a "Recent Activity" list of the 5 most recent
 *   evaluation events.
 *
 *   Both roles see the same SHAPE (four status tiles + total),
 *   only the dataset and the "Recent Activity" panel differ.
 *
 * Empty states (FR-024 + clarified Q4):
 *   - Submitter with zero ideas: all counts = 0 + CTA card linking
 *     to /ideas/new ("Submit your first idea").
 *   - Evaluator with no evaluation events yet: the Recent Activity
 *     list renders a "No evaluations yet" placeholder. (Stat cards
 *     still show real numbers — at least the seeded ideas are
 *     there.)
 *
 * Read by: Next.js — mapped to `/dashboard`.
 * ====================================================================
 */

import Link from "next/link";
import type { Status } from "@prisma/client";
import { ArrowRight, Lightbulb, PlusCircle } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

/* The four statuses in the order they appear on the dashboard.
 * Same order as the lifecycle flow so the cards read left-to-right
 * the way the storyline reads. */
const STATUS_ORDER: Status[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
];

/* Shape returned by `prisma.idea.groupBy`. We post-process it into
 * a {Status → count} map. */
type StatusGroup = { status: Status; _count: { _all: number } };

function tallyByStatus(rows: StatusGroup[]): Record<Status, number> {
  const result: Record<Status, number> = {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    ACCEPTED: 0,
    REJECTED: 0,
  };
  for (const r of rows) {
    result[r.status] = r._count._all;
  }
  return result;
}

function formatTimestamp(d: Date): string {
  const iso = d.toISOString();
  return iso.slice(0, 10) + " " + iso.slice(11, 16) + " UTC";
}

/*
 * DashboardPage
 * --------------------------------------------------------------------
 * Inputs: none (server component).
 * Outputs: role-aware stat-card grid + (Evaluators only) recent
 *   activity list.
 * Callers: Next.js (route mapping).
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const isSubmitter = user.role === "SUBMITTER";

  // Aggregate by status. For Submitters we filter by submitterId;
  // for Evaluators we count every idea.
  const groupedRaw = await prisma.idea.groupBy({
    by: ["status"],
    _count: { _all: true },
    ...(isSubmitter ? { where: { submitterId: user.id } } : {}),
  });
  const counts = tallyByStatus(groupedRaw as StatusGroup[]);
  const total =
    counts.SUBMITTED + counts.UNDER_REVIEW + counts.ACCEPTED + counts.REJECTED;

  // Evaluator-only: the 5 most recent evaluation events. Submitters
  // don't see this panel.
  const recentActivity = !isSubmitter
    ? await prisma.evaluation.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          idea: { select: { id: true, title: true } },
          evaluator: { select: { name: true } },
        },
      })
    : [];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Welcome, {user.name ?? user.email}.
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSubmitter
            ? "Your ideas, in one place."
            : "Every idea in the portal."}
        </p>
      </div>

      {/* ---------------- Stat tiles ---------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total card */}
        <Card>
          <CardContent className="p-5 space-y-1">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Total
            </p>
            <p className="font-mono text-3xl font-semibold tracking-tight">
              {total}
            </p>
          </CardContent>
        </Card>

        {/* Four status tiles in lifecycle order */}
        {STATUS_ORDER.map((s) => (
          <Card key={s}>
            <CardContent className="p-5 space-y-2">
              <StatusBadge status={s} size="sm" />
              <p className="font-mono text-3xl font-semibold tracking-tight">
                {counts[s]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ---------------- Empty-state CTA (Submitter only) ---- */}
      {isSubmitter && total === 0 && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Lightbulb className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                You haven&apos;t submitted any ideas yet.
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Submit your first idea to see it tracked here.
              </p>
            </div>
            <Link href="/ideas/new" className={buttonVariants()}>
              <PlusCircle className="h-4 w-4" />
              Submit your first idea
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ---------------- Recent Activity (Evaluator only) ---- */}
      {!isSubmitter && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Recent activity
          </h2>
          {recentActivity.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No evaluations yet.
              </p>
            </div>
          ) : (
            <ol className="space-y-2">
              {recentActivity.map((ev) => (
                <li key={ev.id}>
                  <Link
                    href={`/ideas/${ev.idea.id}`}
                    className="group flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40"
                  >
                    <StatusBadge status={ev.priorStatus} size="sm" />
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <StatusBadge status={ev.newStatus} size="sm" />
                    <span className="text-sm font-medium text-foreground group-hover:text-primary">
                      {ev.idea.title}
                    </span>
                    <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                      <span>by {ev.evaluator.name}</span>
                      <span className="font-mono">
                        {formatTimestamp(ev.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </section>
  );
}
