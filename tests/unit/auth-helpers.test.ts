/*
 * tests/unit/auth-helpers.test.ts
 * ====================================================================
 * What this file is: a Vitest unit test for `requireRole` and its
 *   companions in lib/auth-helpers.ts.
 *
 * Why it exists: spec FR-019, FR-020 and the role-gating in every
 *   Server Action depend on `requireRole`. A regression here would
 *   either lock out the right user (annoying) or, far worse,
 *   silently let a Submitter through to an Evaluator-only action
 *   (security regression). Pinning the three branches in tests is
 *   cheap insurance.
 *
 * Cases covered:
 *   1. requireRole returns the user when the role matches.
 *   2. requireRole redirects to /dashboard when authenticated but
 *      the role doesn't match.
 *   3. requireRole redirects to /login when there is no session.
 *
 * Mocks:
 *   - `next/navigation` → `redirect` is a no-op that THROWS a
 *      recognizable error so we can assert which path was taken.
 *   - `@/auth` → `auth()` returns a controlled value per test.
 *
 * Run by: `npm run test`.
 * ====================================================================
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

/*
 * Mock next/navigation BEFORE importing the helper. `redirect()` in
 * production throws a special internal error to short-circuit the
 * server render. We replace it with a plain throw whose message
 * carries the destination so the assertions can read it.
 */
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

/*
 * Mock @/auth so the helper sees whatever session each test wants.
 * The mocked `auth` is a `vi.fn()` we override per case with
 * `vi.mocked(auth).mockResolvedValueOnce(...)`.
 */
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
import { requireRole, getSessionUser } from "@/lib/auth-helpers";

describe("requireRole", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("returns the user when the role matches", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "u_admin",
        email: "admin@innova.local",
        name: "Admin",
        role: "EVALUATOR",
      },
      expires: "2099-01-01T00:00:00.000Z",
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const user = await requireRole("EVALUATOR");

    expect(user.id).toBe("u_admin");
    expect(user.role).toBe("EVALUATOR");
  });

  it("redirects to /dashboard when authenticated but role mismatches", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "u_alice",
        email: "alice@innova.local",
        name: "Alice",
        role: "SUBMITTER",
      },
      expires: "2099-01-01T00:00:00.000Z",
    } as unknown as Awaited<ReturnType<typeof auth>>);

    // The redirect mock throws a Error("REDIRECT:/dashboard") which
    // `requireRole` does not catch — that's the behavior we want.
    await expect(requireRole("EVALUATOR")).rejects.toThrow(
      "REDIRECT:/dashboard",
    );
  });

  it("redirects to /login when there is no session", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    await expect(requireRole("EVALUATOR")).rejects.toThrow(
      "REDIRECT:/login",
    );
  });
});

describe("getSessionUser", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
  });

  it("returns null when there is no session (does not throw)", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null);

    const result = await getSessionUser();
    expect(result).toBeNull();
  });
});
