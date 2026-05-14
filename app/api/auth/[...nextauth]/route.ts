/*
 * app/api/auth/[...nextauth]/route.ts
 * ====================================================================
 * What this file is: the catch-all HTTP route Auth.js v5 owns. Every
 *   path under `/api/auth/*` (sign-in, sign-out, callback, csrf,
 *   session, providers, etc.) routes through here.
 *
 * Why it exists: Auth.js v5 ships a single pair of handlers
 *   (GET + POST) that handle every internal endpoint. We re-export
 *   them from the single Auth.js config in `auth.ts` so this file
 *   stays tiny on purpose.
 *
 * IMPORTANT: middleware.ts MUST NOT match this path. If it did,
 *   Auth.js's own redirects would be intercepted and the sign-in
 *   flow would loop. (The middleware matcher in T024 is scoped to
 *   `/dashboard/:path*`, `/ideas/:path*`, and
 *   `/api/attachments/:path*` for exactly this reason.)
 *
 * Read by: Next.js itself — wired automatically by App Router
 *   convention for `[...nextauth]` catch-all segments.
 * ====================================================================
 */

import { handlers } from "@/auth";

// Destructure GET/POST from the handlers object Auth.js exposes
// in `auth.ts`. Next.js's App Router picks up these named exports
// automatically for the matching HTTP methods.
export const { GET, POST } = handlers;
