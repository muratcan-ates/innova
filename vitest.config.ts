/*
 * vitest.config.ts
 * ====================================================================
 * What this file is: configuration for Vitest, the unit-test runner.
 *
 * Why it exists: Innova has exactly three Vitest unit tests, all on
 *   pure-logic helpers (lib/transitions, lib/file-validation,
 *   lib/auth-helpers). Each runs in Node (no DOM, no React),
 *   so this config deliberately stays minimal.
 *
 * Scope (operator-approved during /speckit-plan):
 *   - Vitest covers ONLY pure logic in tests/unit/*.test.ts.
 *   - NO component tests, NO snapshot tests, NO API contract tests.
 *   - End-to-end UX coverage is the Playwright spec in e2e/.
 *
 * Read by: the `vitest` CLI when `npm run test` runs.
 * ====================================================================
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // node env — no jsdom needed because the tests are pure logic.
    environment: "node",
    // include ONLY the three intentional unit-test files. Anything
    // outside tests/unit/ is ignored even if it ends in .test.ts —
    // this is the cheapest way to enforce the "no component tests"
    // scope cap.
    include: ["tests/unit/**/*.test.ts"],
    // node-friendly globals (`describe`, `it`, `expect`) without
    // importing them in every test file. Keeps tests readable.
    globals: true,
  },
  resolve: {
    // Mirror the tsconfig path alias so `import { x } from "@/lib/.."`
    // resolves the same way it does at runtime in Next.js.
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
});
