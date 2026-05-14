/*
 * app/(app)/ideas/[id]/page.tsx
 * ====================================================================
 * What this file is: the idea detail page — the route every list
 *   row links to. Shows title, status badge, full description,
 *   metadata (submitter + date + category), attachment download,
 *   and the evaluation history timeline.
 *
 * Why it exists: spec US-7 (read-side) + FR-014 + FR-015 + FR-021.
 *   This is the page the demo's status-walk happens on; T052
 *   (Phase 9) adds the Evaluator-only write panel underneath.
 *
 * Access control (FR-014):
 *   - Submitters may view their OWN idea only.
 *   - Evaluators may view any idea.
 *   - Anyone else trying to access this URL (different Submitter,
 *     unauthenticated) gets a `notFound()` 404 — never an error
 *     page that confirms the idea exists.
 *
 * Read by: Next.js — mapped to `/ideas/[id]`.
 * ====================================================================
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { Paperclip } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import {
  EvaluationTimeline,
  type EvaluationEvent,
} from "@/components/evaluation-timeline";

const CATEGORY_LABELS: Record<string, string> = {
  PRODUCT: "Product",
  PROCESS: "Process",
  TECHNOLOGY: "Technology",
  CUSTOMER_EXPERIENCE: "Customer Experience",
  OTHER: "Other",
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/*
 * IdeaDetailPage
 * --------------------------------------------------------------------
 * Inputs: route param `id` (Promise — Next.js 15 typed routes).
 * Outputs: the rendered idea detail OR a `notFound()` response.
 * Callers: Next.js (route mapping).
 *
 * Note: T052 (Phase 9) will add the `<EvaluationPanel />` rendered
 * conditionally for Evaluators below the timeline. For now the
 * page is read-only.
 */
export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // Load the idea + submitter + history in one query. The history
  // is sorted oldest-first (the timeline expects that order).
  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      submitter: { select: { id: true, name: true } },
      evaluations: {
        orderBy: { createdAt: "asc" },
        include: { evaluator: { select: { name: true } } },
      },
    },
  });

  // (a) Idea must exist.
  if (!idea) notFound();

  // (b) FR-014 audience check: owner OR any Evaluator.
  const isOwner = idea.submitterId === user.id;
  const isEvaluator = user.role === "EVALUATOR";
  if (!isOwner && !isEvaluator) notFound();

  return (
    <section className="space-y-6">
      {/* ---------------- Header card ---------------- */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={idea.status} />
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              {CATEGORY_LABELS[idea.category]}
            </p>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {idea.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Submitted by{" "}
            <span className="font-medium text-foreground">
              {idea.submitter.name}
            </span>{" "}
            on{" "}
            <span className="font-mono">{formatDate(idea.createdAt)}</span>
          </p>
        </CardContent>
      </Card>

      {/* ---------------- Description ---------------- */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-display text-lg font-semibold">Description</h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {idea.description}
          </p>
          {idea.filePath && (
            <div className="border-t border-border pt-4">
              <Link
                href={`/api/attachments/${idea.id}`}
                className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}
              >
                <Paperclip className="h-3.5 w-3.5" />
                Download attachment
                {idea.fileName && (
                  <span className="text-muted-foreground font-mono text-xs">
                    ({idea.fileName})
                  </span>
                )}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Evaluation timeline ---------------- */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">
          Evaluation history
        </h2>
        <EvaluationTimeline
          events={idea.evaluations as EvaluationEvent[]}
        />
      </section>

      {/* T052 (Phase 9) renders <EvaluationPanel /> here for
          Evaluators only. Not on this page yet. */}
    </section>
  );
}
