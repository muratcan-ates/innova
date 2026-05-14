/*
 * app/(public)/page.tsx
 * ====================================================================
 * What this file is: the landing page (`/`). The first thing every
 *   visitor sees. Hero with a Bricolage display headline, two CTAs
 *   (Sign In / Register), and three feature cards.
 *
 * Why it exists: spec FR-025 + Constitution Principles VII + X.
 *   This is the demo's opening shot — when the jury sits down, this
 *   is the page they look at first. It has to read "production
 *   product", not "weekend hack". Dark surface, indigo accent,
 *   Bricolage display, Geist body, tight spacing, no gradients.
 *
 *   The (public) layout (T029) already provides the top nav with
 *   Sign In / Register, so the CTAs here are duplicates aimed at
 *   visitors who scroll the hero. Both nav and hero land in the
 *   same routes.
 *
 *   The one-and-only Framer Motion stagger animation (Principle II
 *   cap) is added later in T054; without it the cards still render
 *   correctly — they just appear all at once instead of staggered.
 *
 * Read by: Next.js — mapped to `/`.
 * ====================================================================
 */

import Link from "next/link";
import { Lightbulb, Workflow, BadgeCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

/* The three feature cards. Defined as data so a future tweak (copy,
 * order, icon) only touches this array — not the JSX. */
const FEATURES = [
  {
    icon: Lightbulb,
    title: "Submit your idea",
    body:
      "Any employee can submit an idea with a title, description, " +
      "category, and an optional attachment. No template, no committee.",
  },
  {
    icon: Workflow,
    title: "Track the lifecycle",
    body:
      "Every idea moves through a transparent four-stage path — " +
      "Submitted, Under Review, Accepted or Rejected — with a full " +
      "evaluation history that anyone authorized can read.",
  },
  {
    icon: BadgeCheck,
    title: "Evaluate fairly",
    body:
      "Reviewers see every idea, change its status with a comment, " +
      "and build an append-only audit trail. No silent rejections, " +
      "no lost ideas.",
  },
];

/*
 * LandingPage
 * --------------------------------------------------------------------
 * Inputs: none.
 * Outputs: hero + feature grid. The (public) layout supplies the
 *   header nav and `min-h-screen` wrapper; we just fill the main.
 * Callers: Next.js (route mapping).
 */
export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* ---------------- Hero ------------------------------------ */}
      <section className="pt-24 pb-20 text-center">
        <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-4">
          Innova · idea portal
        </p>
        <h1 className="font-display text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          Every idea has a path —{" "}
          <span className="text-primary">make it visible.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          A private innovation portal for one company. Submit, track,
          and evaluate ideas with a transparent, append-only audit
          trail. No voting theater. No silent rejections.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/register"
            className={buttonVariants({ size: "lg" })}
          >
            Get started
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* ---------------- Feature grid ---------------------------- */}
      <section className="pb-24 grid gap-4 md:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title} className="bg-card">
              <CardContent className="p-6 space-y-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.body}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
