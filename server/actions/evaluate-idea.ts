/*
 * server/actions/evaluate-idea.ts
 * ====================================================================
 * What this file is: the Server Action an Evaluator calls to move
 *   an idea along the lifecycle. Records the new status, appends
 *   an Evaluation row to the audit history, and revalidates the
 *   three pages where the change is visible.
 *
 * Why it exists: spec US-6 + FR-016 + FR-017 + FR-018 + FR-018a.
 *   This is the write half of the evaluation loop; the read half
 *   is the EvaluationTimeline on the detail page.
 *
 * Shape: the canonical 5-step skeleton —
 *   (1) session       — `requireRole("EVALUATOR")`.
 *   (2) role          — same.
 *   (3) Zod validate  — `evaluateIdeaSchema`.
 *   (4) DB write      — `prisma.$transaction` around
 *                       `evaluation.create` + `idea.update`.
 *   (5) revalidate    — `/ideas/${id}`, `/ideas`, `/dashboard`.
 *
 *   Two additional checks fire BEFORE step 4:
 *     - `isAllowedTransition(prior, new)` — guards the graph
 *       defensively even if the UI offered a forbidden target
 *       (URL tampering).
 *     - Comment required when newStatus ∈ {ACCEPTED, REJECTED}.
 *
 *   The whole DB write happens inside a single `$transaction` so a
 *   partial failure (e.g. the Evaluation row inserts but the Idea
 *   update fails) rolls back cleanly — the lifecycle never lands
 *   in a half-moved state.
 *
 * Spec mapping: FR-016, FR-017, FR-018, FR-020, US-6.
 *
 * Read by: components/evaluation-panel.tsx (T051).
 * ====================================================================
 */

"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";
import { requireRole } from "@/lib/auth-helpers";
import { evaluateIdeaSchema } from "@/lib/zod-schemas";
import { isAllowedTransition } from "@/lib/transitions";
import type { ActionResult } from "@/lib/action-result";

/*
 * evaluateIdea
 * --------------------------------------------------------------------
 * Inputs:
 *   - formData: ideaId, newStatus, comment (optional).
 * Outputs: ActionResult. On success the panel resets and the
 *   timeline grows by one row.
 * Callers: components/evaluation-panel.tsx via react-hook-form.
 *
 * Wrapped in try/catch with `[INNOVA]` logging per Principle IV.
 */
export async function evaluateIdea(
  formData: FormData,
): Promise<ActionResult> {
  const operation = "evaluateIdea";

  try {
    // (1) + (2) session + role check.
    const evaluator = await requireRole("EVALUATOR");

    // (3) Zod validate.
    const raw = {
      ideaId: formData.get("ideaId"),
      newStatus: formData.get("newStatus"),
      comment: formData.get("comment") ?? "",
    };
    const parsed = evaluateIdeaSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors,
      };
    }
    const { ideaId, newStatus, comment } = parsed.data;

    // Load the idea so we know its current status (the `priorStatus`
    // we'll record on the Evaluation row).
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, status: true },
    });
    if (!idea) {
      return { ok: false, error: "Idea not found." };
    }

    // (3a) Defensive transition check. The UI's dropdown only
    // offers allowed targets, but the server is the trust boundary
    // (FR-016, /speckit-clarify Q1).
    if (!isAllowedTransition(idea.status, newStatus)) {
      return {
        ok: false,
        error: `Transition ${idea.status} → ${newStatus} is not allowed.`,
      };
    }

    // (3b) Comment is required when moving to a terminal status
    // (FR-017). The UI surfaces this inline; we re-check here
    // because the server is the trust boundary.
    if (
      (newStatus === "ACCEPTED" || newStatus === "REJECTED") &&
      comment.trim().length === 0
    ) {
      return {
        ok: false,
        error: "A comment is required when accepting or rejecting an idea.",
        fieldErrors: {
          comment:
            "Please write a one-line note explaining the decision.",
        },
      };
    }

    // (4) DB write inside a transaction. Two rows change together;
    // either both land or neither does.
    await prisma.$transaction(async (tx) => {
      await tx.evaluation.create({
        data: {
          ideaId,
          evaluatorId: evaluator.id,
          priorStatus: idea.status,
          newStatus,
          comment,
        },
      });
      await tx.idea.update({
        where: { id: ideaId },
        data: { status: newStatus },
      });
    });

    logInfo(operation, {
      ideaId,
      evaluatorId: evaluator.id,
      priorStatus: idea.status,
      newStatus,
      commentLength: comment.length,
    });

    // (5) Revalidate the three places the change is visible: the
    // detail page itself, the all-ideas list, and the dashboard.
    revalidatePath(`/ideas/${ideaId}`);
    revalidatePath("/ideas");
    revalidatePath("/dashboard");

    return { ok: true, data: undefined };
  } catch (err) {
    // Let `requireRole`'s redirect bubble up.
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;

    logError(
      operation,
      {
        ideaId: typeof formData.get("ideaId") === "string"
          ? (formData.get("ideaId") as string)
          : null,
      },
      err,
    );
    return {
      ok: false,
      error: "Something went wrong while recording your evaluation. Please try again.",
    };
  }
}
