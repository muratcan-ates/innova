/*
 * e2e/critical-path.spec.ts
 * ====================================================================
 * What this file is: the ONE Playwright end-to-end test in Innova.
 *   Walks the demo storyline: log in as Alice → submit an idea →
 *   log out → log in as Admin → open the new idea → move it
 *   `Submitted → Under Review` → assert the badge updates and the
 *   timeline gained a row.
 *
 * Why it exists: spec FR-016 / FR-018 / US-3 / US-6 / US-7 are all
 *   exercised in this single round-trip. If this spec passes on a
 *   clean DB, the demo storyline is highly likely to survive the
 *   jury walk-through.
 *
 * Scope (operator-approved, locked):
 *   - One spec, Chromium only.
 *   - Critical path only — no attachment upload, no edge cases,
 *     no 404-isolation tests.
 *
 * Prerequisites: a freshly seeded DB. Run `npm run db:reset` before
 *   `npm run test:e2e`. The Playwright config auto-starts
 *   `npm run dev`; the DB seed is the operator's responsibility.
 *
 * Run by: `npm run test:e2e`.
 * ====================================================================
 */

import { test, expect } from "@playwright/test";

/* The seeded passwords from prisma/seed.ts. The seed is idempotent,
 * so this test can be re-run against the same DB many times. */
const ALICE = { email: "alice@innova.local", password: "alice123" };
const ADMIN = { email: "admin@innova.local", password: "admin123" };

/* A title unique enough to be findable in the all-ideas list after
 * the round-trip. Timestamp-suffixed so re-runs don't trip over
 * each other's rows. */
const IDEA_TITLE = `E2E lifecycle ${new Date().toISOString().slice(0, 19)}`;
const IDEA_DESCRIPTION =
  "An idea created by the Playwright spec to exercise the full " +
  "submit → evaluate lifecycle in a single round-trip.";

test("critical path: submit → switch user → evaluate", async ({ page }) => {
  // -------------- 1. Sign in as Alice ----------------------------
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ALICE.email);
  await page.getByLabel(/password/i).fill(ALICE.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // -------------- 2. Submit a new idea ---------------------------
  await page.goto("/ideas/new");
  await page.getByLabel(/title/i).fill(IDEA_TITLE);
  await page.getByLabel(/description/i).fill(IDEA_DESCRIPTION);
  // Category select — open the dropdown, pick Process.
  await page.getByRole("combobox", { name: /category/i }).click();
  await page.getByRole("option", { name: /^process$/i }).click();
  await page.getByRole("button", { name: /submit idea/i }).click();

  // After submit we should land on /ideas/<id>, with the Submitted
  // badge visible and the title prominent.
  await expect(page).toHaveURL(/\/ideas\/[a-z0-9]+/);
  await expect(page.getByRole("heading", { name: IDEA_TITLE })).toBeVisible();
  await expect(page.getByText(/^Submitted$/i).first()).toBeVisible();

  // Capture the idea URL so we can come back to it as Admin.
  const ideaUrl = page.url();

  // -------------- 3. Sign out ------------------------------------
  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page).toHaveURL("/");

  // -------------- 4. Sign in as Admin (Evaluator) ----------------
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN.email);
  await page.getByLabel(/password/i).fill(ADMIN.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // -------------- 5. Open the new idea as Admin ------------------
  await page.goto(ideaUrl);
  await expect(page.getByRole("heading", { name: IDEA_TITLE })).toBeVisible();

  // -------------- 6. Move it Submitted → Under Review ------------
  // Count the timeline rows before so we can assert it grew by 1.
  const timelineBefore = await page.locator("ol > li").count();

  // The Evaluator panel's first <Select> is the status dropdown.
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /under review/i }).click();
  await page
    .getByRole("button", { name: /record evaluation/i })
    .click();

  // -------------- 7. Assertions ----------------------------------
  // The new badge on the header should now read "Under Review".
  await expect(
    page.locator("text=Under Review").first(),
  ).toBeVisible({ timeout: 5_000 });

  // The timeline should have exactly one more row than before.
  await expect(async () => {
    const after = await page.locator("ol > li").count();
    expect(after).toBe(timelineBefore + 1);
  }).toPass({ timeout: 5_000 });
});
