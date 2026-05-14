/*
 * middleware.ts
 * ====================================================================
 * What this file is: the Next.js middleware that runs BEFORE every
 *   request to one of our authenticated paths. It checks for a
 *   valid Auth.js session and either lets the request through or
 *   rejects it.
 *
 * Why it exists: spec FR-014 + FR-014a require that
 *   - `/dashboard` and `/ideas/*` redirect unauthenticated HTML
 *     visitors to `/login` (so they sign in instead of seeing a
 *     blank/error page).
 *   - `/api/attachments/*` returns a bare `404` to unauthenticated
 *     callers, NEVER `401` or `403`, because the existence of an
 *     attachment must not leak to the public.
 *
 * IMPORTANT: the matcher MUST NOT include `/api/auth/*` — Auth.js
 *   manages its own routes and intercepting them here would loop.
 *
 * Read by: Next.js automatically, on every request matching the
 *   patterns in `config.matcher` below.
 * ====================================================================
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";

/*
 * The matcher is the canonical place to scope which paths the
 * middleware actually runs for. We deliberately list the three
 * patterns instead of one big wildcard so:
 *   - Static assets (/_next/*, /favicon.ico, /public files) are
 *     untouched.
 *   - Auth.js's own endpoints (/api/auth/*) are untouched.
 *   - The landing page `/` and `/login` / `/register` stay public.
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ideas/:path*",
    "/api/attachments/:path*",
  ],
};

export default auth((req) => {
  const isAuthed = !!req.auth;

  if (isAuthed) return NextResponse.next();

  // Branch on path: attachment URLs get 404, everything else
  // redirects to /login with a `?from=` query so the login page
  // can send the user back where they came from after sign-in.
  const url = new URL(req.nextUrl);

  if (url.pathname.startsWith("/api/attachments/")) {
    // Bare 404 — never expose existence of the attachment to a
    // logged-out caller (spec FR-014a edge case).
    return new NextResponse("Not found", { status: 404 });
  }

  const loginUrl = new URL("/login", req.nextUrl);
  loginUrl.searchParams.set("from", url.pathname + url.search);
  return NextResponse.redirect(loginUrl);
});
