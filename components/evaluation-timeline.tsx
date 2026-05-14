/*
 * components/evaluation-timeline.tsx
 * ====================================================================
 * What this file is: the read-only chronological list of evaluation
 *   events that appears on an idea's detail page. Each event shows
 *   `priorStatus → newStatus`, the Evaluator's name, an ISO
 *   timestamp, and the comment (if any).
 *
 * Why it exists: spec US-7 + FR-018 + FR-018a. The history is the
 *   visible proof that the lifecycle moved. It's append-only — the
 *   absence of any edit/delete control is intentional.
 *
 *   When there are zero events (an idea that hasn't been touched
 *   since submission), we render the empty state placeholder
 *   ("No evaluations yet") rather than a blank gap.
 *
 * Read by: app/(app)/ideas/[id]/page.tsx (the detail page).
 * ====================================================================
 */

import { ArrowRight } from "lucide-react";
import type { Evaluation, User } from "@prisma/client";

import { StatusBadge } from "@/components/status-badge";

/* The shape of an event as the timeline renders it — the Evaluation
 * row plus the evaluator's name (joined in by the parent page). */
export type EvaluationEvent = Evaluation & {
  evaluator: Pick<User, "name">;
};

/* Format the timestamp as "2026-05-15 21:34 UTC" — ISO-ish but
 * with a space + UTC suffix so non-developers don't trip over the
 * "T" and "Z" characters. */
function formatTimestamp(d: Date): string {
  const iso = d.toISOString(); // e.g. "2026-05-15T21:34:01.000Z"
  return iso.slice(0, 10) + " " + iso.slice(11, 16) + " UTC";
}

/*
 * EvaluationTimeline
 * --------------------------------------------------------------------
 * Inputs:
 *   - events: the idea's evaluation history, OLDEST FIRST. (Caller
 *     is responsible for the sort — the timeline trusts the order.)
 * Outputs: the timeline or its empty state.
 * Callers: app/(app)/ideas/[id]/page.tsx.
 */
export function EvaluationTimeline({
  events,
}: {
  events: EvaluationEvent[];
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No evaluations yet.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {events.map((ev) => (
        <li
          key={ev.id}
          className="rounded-lg border border-border bg-card p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={ev.priorStatus} size="sm" />
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <StatusBadge status={ev.newStatus} size="sm" />
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {formatTimestamp(ev.createdAt)}
            </span>
          </div>
          <p className="text-sm">
            <span className="text-muted-foreground">by </span>
            <span className="font-medium text-foreground">
              {ev.evaluator.name}
            </span>
          </p>
          {ev.comment.trim().length > 0 && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap border-t border-border pt-3">
              {ev.comment}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
