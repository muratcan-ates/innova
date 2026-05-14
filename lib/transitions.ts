/*
 * lib/transitions.ts
 * ====================================================================
 * What this file is: the status transition graph for an Idea, plus
 *   two helper functions:
 *     - isAllowedTransition(from, to) → boolean
 *     - getAllowedTargets(from)       → Status[]
 *
 * Why it exists: spec FR-016 (clarified in /speckit-clarify Q1) locks
 *   transitions to "strict linear with reopen" — six allowed edges,
 *   every other pair must be rejected. Two callers read this file:
 *     1. The Evaluator UI (`components/evaluation-panel.tsx`) uses
 *        `getAllowedTargets` to populate the status <Select>, so the
 *        UI cannot offer a forbidden destination.
 *     2. The Server Action (`server/actions/evaluate-idea.ts`) calls
 *        `isAllowedTransition` defensively before writing, so even
 *        a hand-crafted POST cannot bypass the graph.
 *
 *   Encoding the graph as data (a `Record<Status, Status[]>`) makes
 *   the spec's transition list readable at a glance and trivially
 *   testable (see tests/unit/transitions.test.ts in T018).
 *
 * Read by: components/evaluation-panel.tsx, server/actions/evaluate-idea.ts,
 *   tests/unit/transitions.test.ts.
 * ====================================================================
 */

import type { Status } from "@prisma/client";

/*
 * ALLOWED_TRANSITIONS
 * --------------------------------------------------------------------
 * The canonical transition graph. Each key is the CURRENT status,
 * each value is the array of statuses the Evaluator is allowed to
 * move it TO. A NEW status is reachable from the current one if and
 * only if it appears in this array.
 *
 * Forward path:
 *   SUBMITTED    → UNDER_REVIEW
 *   UNDER_REVIEW → ACCEPTED       (comment required, see FR-017)
 *   UNDER_REVIEW → REJECTED       (comment required, see FR-017)
 *
 * Reopen edges:
 *   UNDER_REVIEW → SUBMITTED      (reopen-back)
 *   ACCEPTED     → UNDER_REVIEW   (reopen)
 *   REJECTED     → UNDER_REVIEW   (reopen)
 *
 * NOTE: a status is NEVER allowed to transition to itself (no-op
 * transitions are forbidden — the UI hides the current status from
 * the dropdown, and the server would reject it as "not in the
 * targets list"). This matches the edge case in spec.md.
 */
export const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  SUBMITTED:    ["UNDER_REVIEW"],
  UNDER_REVIEW: ["SUBMITTED", "ACCEPTED", "REJECTED"],
  ACCEPTED:     ["UNDER_REVIEW"],
  REJECTED:     ["UNDER_REVIEW"],
};

/*
 * isAllowedTransition
 * --------------------------------------------------------------------
 * Inputs:
 *   - from: the idea's current status.
 *   - to:   the status the Evaluator wants to move it to.
 * Outputs: `true` only if (from, to) is one of the six allowed
 *   edges above; `false` otherwise (including for from === to).
 * Callers: server/actions/evaluate-idea.ts before any DB write.
 */
export function isAllowedTransition(from: Status, to: Status): boolean {
  // `?? []` guards against a hypothetical Status value that wasn't
  // in the graph (it shouldn't happen since both keys + array
  // entries are exhaustive — but the safety net is one character).
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

/*
 * getAllowedTargets
 * --------------------------------------------------------------------
 * Inputs:
 *   - from: the idea's current status.
 * Outputs: an array of the statuses the Evaluator may move it to
 *   from here. Never includes `from` itself.
 * Callers: components/evaluation-panel.tsx — populates the status
 *   <Select> so the UI literally cannot offer a forbidden target.
 */
export function getAllowedTargets(from: Status): Status[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}
