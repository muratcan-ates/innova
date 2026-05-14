/*
 * tests/unit/transitions.test.ts
 * ====================================================================
 * What this file is: a Vitest unit test that pins the status
 *   transition graph from lib/transitions.ts.
 *
 * Why it exists: spec FR-016 (clarified Q1) locks transitions to a
 *   specific six-edge graph. A typo in that graph would silently
 *   either let an Evaluator skip a stage (e.g. SUBMITTED → ACCEPTED
 *   with no review) OR block a legal reopen. Either failure would
 *   only surface during the demo, where the cost of catching it
 *   late is highest. Three minutes of test code is the cheapest
 *   possible insurance.
 *
 * Scope: tests ONLY the pure functions in lib/transitions.ts.
 *   No DB, no Prisma, no React.
 *
 * Run by: `npm run test` (Vitest, see vitest.config.ts).
 * ====================================================================
 */

import { describe, it, expect } from "vitest";
import type { Status } from "@prisma/client";
import {
  ALLOWED_TRANSITIONS,
  isAllowedTransition,
  getAllowedTargets,
} from "@/lib/transitions";

/*
 * The canonical list of six allowed edges per FR-016. This is the
 * spec literally translated into data — if the spec changes, this
 * list changes, and one of the test cases below will tell us where
 * the implementation drifted.
 */
const ALLOWED_EDGES: Array<[Status, Status]> = [
  ["SUBMITTED", "UNDER_REVIEW"],
  ["UNDER_REVIEW", "ACCEPTED"],
  ["UNDER_REVIEW", "REJECTED"],
  ["UNDER_REVIEW", "SUBMITTED"],
  ["ACCEPTED", "UNDER_REVIEW"],
  ["REJECTED", "UNDER_REVIEW"],
];

/*
 * A representative set of disallowed pairs. We don't enumerate ALL
 * 16 possible pairs minus the 6 allowed; instead we pick the cases
 * most likely to bite during the demo: skipping a stage forward,
 * jumping between terminal states, and no-op self-transitions.
 */
const DISALLOWED_PAIRS: Array<[Status, Status]> = [
  // Skip a stage forward (the most dangerous bug — bypasses review).
  ["SUBMITTED", "ACCEPTED"],
  ["SUBMITTED", "REJECTED"],
  // Jump between terminal states (skips the reopen step).
  ["ACCEPTED", "REJECTED"],
  ["REJECTED", "ACCEPTED"],
  // No-op self-transitions (UI hides these; server must reject).
  ["SUBMITTED", "SUBMITTED"],
  ["UNDER_REVIEW", "UNDER_REVIEW"],
  ["ACCEPTED", "ACCEPTED"],
  ["REJECTED", "REJECTED"],
];

describe("isAllowedTransition", () => {
  it.each(ALLOWED_EDGES)(
    "allows %s → %s",
    (from, to) => {
      expect(isAllowedTransition(from, to)).toBe(true);
    },
  );

  it.each(DISALLOWED_PAIRS)(
    "rejects %s → %s",
    (from, to) => {
      expect(isAllowedTransition(from, to)).toBe(false);
    },
  );
});

describe("getAllowedTargets", () => {
  // The four current statuses each have an expected target set.
  // Encoding the expectation here doubles as living documentation
  // of the graph for anyone reading just the tests.
  const expected: Record<Status, Status[]> = {
    SUBMITTED:    ["UNDER_REVIEW"],
    UNDER_REVIEW: ["SUBMITTED", "ACCEPTED", "REJECTED"],
    ACCEPTED:     ["UNDER_REVIEW"],
    REJECTED:     ["UNDER_REVIEW"],
  };

  it.each(Object.entries(expected) as Array<[Status, Status[]]>)(
    "returns the right targets for %s",
    (from, targets) => {
      expect(getAllowedTargets(from)).toEqual(targets);
    },
  );

  it("never includes the source status in its own targets", () => {
    // No-op transitions are forbidden — the source must never appear
    // in its own target list. Guards against an accidental self-loop.
    for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS) as Array<
      [Status, Status[]]
    >) {
      expect(targets).not.toContain(from);
    }
  });
});
