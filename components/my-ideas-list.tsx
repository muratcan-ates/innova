/*
 * components/my-ideas-list.tsx
 * ====================================================================
 * What this file is: the rendered list of a Submitter's own ideas.
 *   A shadcn `Table` with four columns (Title, Category, Status,
 *   Submitted) and an empty state when the Submitter has no ideas.
 *
 * Why it exists: spec US-4 + FR-011 + FR-024. Submitters need to
 *   track what they've submitted; the spec also requires every
 *   empty list to have an icon-headline-CTA empty state, never
 *   a blank surface.
 *
 *   The list is rendered as a server component (no "use client"
 *   directive at the top of this file) because all data is fetched
 *   by the parent page and passed in as a prop.
 *
 * Read by: `app/(app)/ideas/mine/page.tsx` (T044).
 * ====================================================================
 */

import Link from "next/link";
import { Lightbulb } from "lucide-react";
import type { Idea } from "@prisma/client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// NOTE: Using the plain shadcn <Badge> as a stub here per the task
// plan. T047 introduces a colored <StatusBadge /> component (per
// FR-021) and T049 swaps this stub for it. Until then the badge
// shows the status text without color-coding.

/* The same category labels used by the submission form. Duplicated
 * here (instead of imported from the form component) to keep this
 * file a pure server component — the form component is "use client". */
const CATEGORY_LABELS: Record<Idea["category"], string> = {
  PRODUCT: "Product",
  PROCESS: "Process",
  TECHNOLOGY: "Technology",
  CUSTOMER_EXPERIENCE: "Customer Experience",
  OTHER: "Other",
};

/* Date formatter — locale-independent, demo-friendly. */
function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/*
 * MyIdeasList
 * --------------------------------------------------------------------
 * Inputs:
 *   - ideas: the Submitter's own ideas, already sorted newest first.
 * Outputs: a table when there are ideas, an empty state CTA when not.
 * Callers: app/(app)/ideas/mine/page.tsx.
 */
export function MyIdeasList({ ideas }: { ideas: Idea[] }) {
  if (ideas.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Lightbulb className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">
          No ideas yet
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit your first idea to see it tracked here.
        </p>
        <Link
          href="/ideas/new"
          className={`${buttonVariants()} mt-6`}
        >
          Submit your first idea
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ideas.map((idea) => (
            <TableRow key={idea.id}>
              <TableCell>
                <Link
                  href={`/ideas/${idea.id}`}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {idea.title}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {CATEGORY_LABELS[idea.category]}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono text-xs">
                  {idea.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {formatDate(idea.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
