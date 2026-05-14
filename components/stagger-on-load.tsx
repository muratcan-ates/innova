/*
 * components/stagger-on-load.tsx
 * ====================================================================
 * What this file is: the ONE Framer Motion animation in Innova. A
 *   page-load stagger that fades each child into place, ~80ms apart.
 *
 * Why it exists: Constitution Principle II caps Framer Motion at
 *   "one page-load stagger animation only". This is that one
 *   animation. Applied to the three landing-page feature cards
 *   (T038) — nowhere else.
 *
 *   Visual goal: subtle. A 0.4s fade + 16px slide-up per card,
 *   80ms apart. No bounce, no overshoot, no rotation. Linear (or
 *   gentle ease-out) curves only. We're aiming at Linear / Vercel /
 *   Raycast — not a marketing site.
 *
 * Read by: app/(public)/page.tsx (T038).
 *
 * Client component because Framer Motion uses browser APIs.
 * ====================================================================
 */

"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";

/* The container "orchestrates" — it has its own animate state but
 * the only thing that matters is `staggerChildren`. Each child
 * inherits the staggered start. */
const CONTAINER_VARIANTS: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08, // 80 ms between each child
      delayChildren: 0.05,
    },
  },
};

const CHILD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

/*
 * StaggerOnLoad
 * --------------------------------------------------------------------
 * Inputs:
 *   - children: any number of React children. Each one is wrapped
 *     in a `motion.div` and joins the stagger.
 *   - className: optional className for the OUTER container.
 * Outputs: the children rendered with the page-load stagger.
 * Callers: app/(public)/page.tsx (the landing page).
 */
export function StaggerOnLoad({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={CONTAINER_VARIANTS}
    >
      {/* Wrap each child in a motion.div so it inherits the child
          variants. We use React.Children.map so the call site can
          pass a JSX expression (`{ARRAY.map(...)}`) directly. */}
      {React.Children.map(children, (child, i) => (
        <motion.div key={i} variants={CHILD_VARIANTS}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

