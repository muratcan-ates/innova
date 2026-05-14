/*
 * app/(app)/layout.tsx
 * ====================================================================
 * What this file is: the layout that wraps every AUTHENTICATED
 *   route — /dashboard, /ideas, /ideas/new, /ideas/mine, /ideas/[id].
 *   It does three jobs:
 *     1. Enforces authentication via `requireUser()` so an
 *        unauthenticated visitor never sees these pages (even with
 *        middleware off in some odd edge case, the layout is a
 *        belt-and-suspenders second check).
 *     2. Provides the shadcn <SidebarProvider> context the
 *        <AppSidebar /> primitive needs.
 *     3. Renders the role-aware sidebar to the left of the page
 *        contents.
 *
 * Read by: Next.js automatically for every route under `app/(app)/`.
 * ====================================================================
 */

import { requireUser } from "@/lib/auth-helpers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

/*
 * AppLayout
 * --------------------------------------------------------------------
 * Inputs: { children } — the authenticated route to render.
 * Outputs: a two-column layout with the role-aware sidebar on the
 *   left and the page contents on the right.
 * Callers: Next.js (implicit).
 *
 * Async because `requireUser()` needs to await the session.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <div className="mx-auto max-w-6xl w-full px-6 py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
