/*
 * app/(public)/layout.tsx
 * ====================================================================
 * What this file is: the layout that wraps every PUBLIC route —
 *   landing page (/), /login, /register. It deliberately has NO
 *   sidebar: signed-out visitors should see a clean hero with two
 *   prominent CTAs (Sign In / Register), not the authenticated
 *   shell.
 *
 * Why it exists: spec FR-025 says the landing page is a hero +
 *   three feature cards + Sign In / Register CTAs. Putting the
 *   layout in a route group (`(public)/`) lets us keep this
 *   layout completely separate from the authenticated layout
 *   (`app/(app)/layout.tsx`) without conditional rendering.
 *
 *   The route group `(public)` does NOT appear in the URL — files
 *   inside still map to /, /login, /register.
 *
 * Read by: Next.js itself for every route under `app/(public)/`.
 * ====================================================================
 */

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth-helpers";

/*
 * PublicLayout
 * --------------------------------------------------------------------
 * Inputs: { children } — the public route Next.js is about to render.
 * Outputs: a top-of-page nav bar plus the children below.
 *   When the visitor is signed in (rare for public pages), the nav
 *   surfaces an "Open Dashboard" button so they don't get stuck on
 *   the landing page. When signed out, it shows Sign In + Register.
 * Callers: Next.js (implicit).
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getSessionUser is nullable — perfect for branching in the nav.
  const user = await getSessionUser();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-background">
        <nav className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight"
          >
            Innova
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className={buttonVariants()}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonVariants({ variant: "ghost" })}
                >
                  Sign in
                </Link>
                <Link href="/register" className={buttonVariants()}>
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
