/*
 * components/app-sidebar.tsx
 * ====================================================================
 * What this file is: the left-side navigation rendered on every
 *   authenticated route. It is role-aware: Submitters see
 *   "Dashboard" + "Submit Idea" + "My Ideas"; Evaluators see
 *   "Dashboard" + "All Ideas". Both see "Log Out" at the bottom.
 *
 * Why it exists: spec FR-026 pins this exact layout. Centralizing
 *   the nav here means a route change in one place (Add a new
 *   user surface? Move a page?) only touches this file.
 *
 *   Lives outside `components/ui/` because it composes shadcn
 *   primitives — it is NOT a primitive itself.
 *
 * Read by: `app/(app)/layout.tsx`.
 * ====================================================================
 */

import Link from "next/link";
import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  ClipboardList,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { signOut } from "@/auth";
import type { SessionUser } from "@/lib/auth-helpers";

/*
 * AppSidebar
 * --------------------------------------------------------------------
 * Inputs:
 *   - user: the SessionUser for the current request. Determines
 *     which nav items render.
 * Outputs: a shadcn <Sidebar> with role-appropriate links and a
 *   sign-out form button.
 * Callers: app/(app)/layout.tsx.
 *
 * The sign-out button uses a Server Action via `<form action={...}>`
 * so it works without client JavaScript and triggers Auth.js's
 * `signOut()` cleanly. Wrapping it in a form is the canonical
 * Auth.js v5 pattern.
 */
export function AppSidebar({ user }: { user: SessionUser }) {
  const isSubmitter = user.role === "SUBMITTER";

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-3 py-2">
          <Link
            href="/"
            className="font-display text-lg font-semibold tracking-tight"
          >
            Innova
          </Link>
          <p className="text-xs text-muted-foreground mt-1">
            {user.name ?? user.email}
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/dashboard" />}>
              <LayoutDashboard />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {isSubmitter ? (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/ideas/new" />}>
                  <PlusCircle />
                  <span>Submit Idea</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/ideas/mine" />}>
                  <ListChecks />
                  <span>My Ideas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/ideas" />}>
                <ClipboardList />
                <span>All Ideas</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        {/* Sign-out goes through a Server Action so it works
            without client JS. The form posts to a tiny inline
            action that calls Auth.js's signOut. */}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <SidebarMenuButton type="submit" className="w-full">
            <LogOut />
            <span>Log Out</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
