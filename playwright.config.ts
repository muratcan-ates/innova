/*
 * playwright.config.ts
 * ====================================================================
 * What this file is: configuration for Playwright, the end-to-end
 *   test runner.
 *
 * Why it exists: Innova has exactly ONE Playwright spec
 *   (e2e/critical-path.spec.ts in T055), which walks the demo
 *   storyline: submitter logs in → submits an idea → logs out →
 *   evaluator logs in → moves the idea Under Review → asserts the
 *   badge updates. This config keeps the runner narrow: chromium
 *   only, single worker, default reporter.
 *
 * Scope (operator-approved during /speckit-plan):
 *   - One end-to-end spec covering the critical path only.
 *   - NO cross-browser matrix (no Firefox, no WebKit).
 *   - NO mobile viewport runs.
 *   - NO visual snapshots.
 *
 * Read by: the `playwright` CLI when `npm run test:e2e` runs.
 * ====================================================================
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // The e2e directory holds exactly one spec file.
  testDir: "./e2e",

  // Fail fast — one spec, no flake tolerance budget.
  retries: 0,
  workers: 1,
  fullyParallel: false,

  // Reporter: list output on stdout; HTML report for `npx playwright show-report`.
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    // Every test issues requests against the locally-served Next.js app.
    baseURL: "http://localhost:3000",
    // Capture a trace when a test fails so the operator can replay
    // the failure step-by-step. `on-first-retry` defers to first
    // retry, but with retries=0 we keep traces on every failure.
    trace: "retain-on-failure",
    // Same idea for the on-failure screenshot.
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Auto-start the Next.js dev server before running tests, then
  // tear it down on exit. The reuseExistingServer flag lets a
  // developer who is already running `npm run dev` skip the
  // duplicate boot.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // Give the first boot a generous window — Tailwind v4 + Turbopack
    // cold-compile can take 30–60s on first request.
    timeout: 120_000,
  },
});
