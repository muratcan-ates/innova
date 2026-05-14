/*
 * components/evaluation-panel.tsx
 * ====================================================================
 * What this file is: the Evaluator-only write surface on an idea's
 *   detail page. A status `<Select>` (populated dynamically by
 *   `getAllowedTargets(currentStatus)` so the UI literally cannot
 *   offer a forbidden destination) plus a comment `<Textarea>`
 *   plus a Submit button.
 *
 * Why it exists: spec US-6 + FR-016 + FR-017 + FR-020. This is
 *   the demo's headline moment — clicking through `SUBMITTED →
 *   UNDER_REVIEW → ACCEPTED` and watching the badge change color.
 *
 * Role gating: the parent page already gates rendering on
 *   `session.user.role === "EVALUATOR"` (T052). This component
 *   doesn't re-check — it trusts the parent.
 *
 *   The Server Action `evaluateIdea` is the ACTUAL trust boundary;
 *   even if a Submitter found a way to render this panel, the
 *   server would reject the write.
 *
 * Read by: app/(app)/ideas/[id]/page.tsx (wired in T052).
 * ====================================================================
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Status } from "@prisma/client";

import { evaluateIdea } from "@/server/actions/evaluate-idea";
import { getAllowedTargets } from "@/lib/transitions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_LABEL: Record<Status, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

/*
 * EvaluationPanel
 * --------------------------------------------------------------------
 * Inputs:
 *   - ideaId:        the idea being evaluated.
 *   - currentStatus: the idea's status RIGHT NOW. Determines which
 *                    targets the Select can offer.
 * Outputs: the panel UI. On successful submit the panel resets to
 *   empty + the page refreshes (router.refresh) so the timeline
 *   below grows by one row.
 * Callers: app/(app)/ideas/[id]/page.tsx (T052) — rendered only
 *   when the viewer is an Evaluator.
 */
export function EvaluationPanel({
  ideaId,
  currentStatus,
}: {
  ideaId: string;
  currentStatus: Status;
}) {
  const router = useRouter();

  // `useTransition` lets us flip a `isPending` flag without
  // manually juggling a `useState` boolean around an async call.
  // Also marks the Server Action call as a low-priority render
  // update so the UI stays responsive.
  const [isPending, startTransition] = useTransition();

  const [target, setTarget] = useState<Status | "">("");
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  const allowedTargets = getAllowedTargets(currentStatus);

  // If there are no allowed targets, the idea is in a terminal
  // state the evaluator just left it in (this can't happen with
  // the current graph — every status has at least one outgoing
  // edge — but we render defensively).
  if (allowedTargets.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            No further transitions available from this status.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isTerminalTarget = target === "ACCEPTED" || target === "REJECTED";
  const commentRequired = isTerminalTarget;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCommentError(null);

    if (!target) {
      toast.error("Choose a new status.");
      return;
    }

    if (commentRequired && comment.trim().length === 0) {
      const msg = "A comment is required when accepting or rejecting an idea.";
      setCommentError(msg);
      toast.error(msg);
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("ideaId", ideaId);
      fd.set("newStatus", target);
      fd.set("comment", comment);

      const result = await evaluateIdea(fd);

      if (result.ok) {
        toast.success(`Status updated to ${STATUS_LABEL[target as Status]}.`);
        setTarget("");
        setComment("");
        router.refresh();
      } else {
        toast.error(result.error);
        if (result.fieldErrors?.comment) {
          setCommentError(result.fieldErrors.comment);
        }
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Move this idea to…
            </label>
            <Select
              value={target}
              onValueChange={(v) => setTarget(v as Status)}
              disabled={isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a new status" />
              </SelectTrigger>
              <SelectContent>
                {allowedTargets.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Comment{" "}
              {commentRequired ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              )}
            </label>
            <Textarea
              rows={3}
              placeholder={
                commentRequired
                  ? "Required when accepting or rejecting."
                  : "Optional note for the audit trail."
              }
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (commentError) setCommentError(null);
              }}
              disabled={isPending}
              maxLength={5000}
            />
            {commentError && (
              <p className="text-sm text-destructive">{commentError}</p>
            )}
          </div>

          <Button type="submit" disabled={isPending || !target}>
            {isPending ? "Recording…" : "Record evaluation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
