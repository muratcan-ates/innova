/*
 * components/status-badge.tsx
 * ====================================================================
 * What this file is: the colored status pill rendered next to every
 *   idea's title. One component, four colors.
 *
 * Why it exists: spec FR-021 pins the colors:
 *   - SUBMITTED    → gray
 *   - UNDER_REVIEW → blue
 *   - ACCEPTED     → green
 *   - REJECTED     → red
 *
 *   It also pins the human-readable labels (Title Case + space-
 *   separated, not the SHOUTY_SNAKE enum). Centralizing both here
 *   means a future tweak (say, renaming "Rejected" to "Closed")
 *   only touches one file.
 *
 *   Color values come from the `--innova-status-*` tokens declared
 *   in `app/globals.css` (T005). We render inline `style` because
 *   Tailwind v4's arbitrary-value classes are awkward to type-check
 *   for dynamic colors, and a static palette is more legible.
 *
 * Read by: components/my-ideas-list.tsx, components/ideas-data-table.tsx,
 *   app/(app)/ideas/[id]/page.tsx (the detail page).
 * ====================================================================
 */

import type { Status } from "@prisma/client";

/* Maps the enum to (a) the human label and (b) the foreground +
 * background colors. The colors are CSS variable references so a
 * brand re-pal only touches `app/globals.css`. */
const STATUS_STYLE: Record<
  Status,
  { label: string; fg: string; bg: string }
> = {
  SUBMITTED: {
    label: "Submitted",
    fg: "var(--innova-status-submitted)",
    bg: "color-mix(in oklab, var(--innova-status-submitted) 15%, transparent)",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    fg: "var(--innova-status-under-review)",
    bg: "color-mix(in oklab, var(--innova-status-under-review) 15%, transparent)",
  },
  ACCEPTED: {
    label: "Accepted",
    fg: "var(--innova-status-accepted)",
    bg: "color-mix(in oklab, var(--innova-status-accepted) 15%, transparent)",
  },
  REJECTED: {
    label: "Rejected",
    fg: "var(--innova-status-rejected)",
    bg: "color-mix(in oklab, var(--innova-status-rejected) 15%, transparent)",
  },
};

/*
 * StatusBadge
 * --------------------------------------------------------------------
 * Inputs:
 *   - status: the Idea's current status (or any historic status in
 *     the evaluation timeline).
 *   - size: 'sm' for inline list rows, 'md' (default) for the
 *     larger badge next to the idea title on the detail page.
 * Outputs: a colored pill with the human-readable label.
 * Callers: lists (Phases 6–7) and the detail page (T049).
 */
export function StatusBadge({
  status,
  size = "md",
}: {
  status: Status;
  size?: "sm" | "md";
}) {
  const style = STATUS_STYLE[status];
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[11px]"
      : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-md font-mono font-medium uppercase tracking-wide ${sizeClasses}`}
      style={{ color: style.fg, backgroundColor: style.bg }}
    >
      {style.label}
    </span>
  );
}
