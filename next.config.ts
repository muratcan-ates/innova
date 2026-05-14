/*
 * next.config.ts
 * ====================================================================
 * What this file is: the Next.js project config.
 *
 * Why it exists: at MVP scale we need exactly one customization —
 *   disabling the dev-mode overlay. See `devIndicators` below.
 *
 * Read by: Next.js itself at boot.
 * ====================================================================
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * devIndicators: false
   * ------------------------------------------------------------------
   * Disables the bottom-corner Next.js dev overlay (the small pill
   * showing build/ISR status). Two reasons:
   *
   *   1. The overlay renders as a fixed-position `<nextjs-portal>`
   *      element that intercepts pointer events in the bottom-right
   *      of the viewport. Playwright's actionability checks see the
   *      button as "occluded" and refuse to click — even when the
   *      button works fine for a human. Turning the overlay off is
   *      the upstream-clean fix.
   *
   *   2. The overlay is debug UI; nothing in the spec or constitution
   *      requires it. Production builds don't include it.
   *
   * Affects: dev mode only. `npm run build` is unaffected.
   */
  devIndicators: false,
};

export default nextConfig;
