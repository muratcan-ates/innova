/*
 * components/ideas-data-table.tsx
 * ====================================================================
 * What this file is: the Evaluator's view of every idea in the
 *   system. Renders a sortable table with a status filter <Select>
 *   above it. Sort is by submission date (asc/desc toggle on the
 *   column header); the status filter narrows rows client-side.
 *
 * Why it exists: spec US-5 + FR-012 + FR-013 + FR-024. The
 *   base-nova preset of shadcn/ui doesn't ship a `data-table`
 *   primitive (the original tasks list called for one in T007),
 *   so this file is the equivalent — a small, focused composition
 *   on top of the shadcn `Table` primitive. No `@tanstack/react-table`
 *   dependency: at MVP scale (a few dozen rows) inline `useState`
 *   sorting + filtering is cheaper to ship and easier to defend.
 *
 *   Client component because sort + filter need `useState`.
 *
 * Read by: `app/(app)/ideas/page.tsx` (T046).
 * ====================================================================
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";

/* The shape of the rows passed in by the parent page. We define
 * it inline rather than importing from `@prisma/client` so the
 * parent can `select` only what we render (smaller payload). */
export type IdeaRow = {
  id: string;
  title: string;
  category:
    | "PRODUCT"
    | "PROCESS"
    | "TECHNOLOGY"
    | "CUSTOMER_EXPERIENCE"
    | "OTHER";
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  createdAt: Date;
  submitterName: string;
};

const CATEGORY_LABELS: Record<IdeaRow["category"], string> = {
  PRODUCT: "Product",
  PROCESS: "Process",
  TECHNOLOGY: "Technology",
  CUSTOMER_EXPERIENCE: "Customer Experience",
  OTHER: "Other",
};

const STATUS_FILTER_OPTIONS: Array<{
  value: "ALL" | IdeaRow["status"];
  label: string;
}> = [
  { value: "ALL", label: "All statuses" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/*
 * IdeasDataTable
 * --------------------------------------------------------------------
 * Inputs:
 *   - rows: every idea in the system (already shaped to IdeaRow).
 * Outputs: the filtered + sorted table.
 * Callers: app/(app)/ideas/page.tsx.
 */
export function IdeasDataTable({ rows }: { rows: IdeaRow[] }) {
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | IdeaRow["status"]
  >("ALL");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  /*
   * The visible rows: filter first, then sort. useMemo so we
   * don't redo the work on every keystroke elsewhere on the page.
   */
  const visible = useMemo(() => {
    const filtered =
      statusFilter === "ALL"
        ? rows
        : rows.filter((r) => r.status === statusFilter);
    const sorted = [...filtered].sort((a, b) => {
      const at = a.createdAt.getTime();
      const bt = b.createdAt.getTime();
      return sortDir === "desc" ? bt - at : at - bt;
    });
    return sorted;
  }, [rows, statusFilter, sortDir]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {visible.length} of {rows.length}{" "}
          {rows.length === 1 ? "idea" : "ideas"}
        </p>
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as "ALL" | IdeaRow["status"])
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Submitter</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                {/* Click toggles sort direction. The icon hints at
                    current direction; the column always sorts by
                    createdAt — Title/Category/Status are not
                    sortable in MVP. */}
                <button
                  type="button"
                  onClick={() =>
                    setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary"
                  aria-label="Toggle sort by submission date"
                >
                  Submitted
                  {sortDir === "desc" ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUp className="h-3 w-3" />
                  )}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No ideas match this filter.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">
                    {r.submitterName}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/ideas/${r.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {r.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {CATEGORY_LABELS[r.category]}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} size="sm" />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
