/*
 * app/(app)/ideas/new/page.tsx
 * ====================================================================
 * What this file is: the /ideas/new route — the page that hosts the
 *   submission form. Submitter-only.
 *
 * Why it exists: spec US-3. An Evaluator visiting this route is
 *   redirected to /dashboard by `requireRole("SUBMITTER")` (FR-014
 *   spirit — keep role boundaries enforced at every layer).
 *
 * Read by: Next.js — mapped to `/ideas/new`.
 * ====================================================================
 */

import { requireRole } from "@/lib/auth-helpers";
import { IdeaSubmissionForm } from "@/components/idea-submission-form";

/*
 * NewIdeaPage
 * --------------------------------------------------------------------
 * Inputs: none (server component).
 * Outputs: the IdeaSubmissionForm wrapped in a section heading.
 * Callers: Next.js (route mapping).
 *
 * `requireRole` either returns the user (role matches) or throws a
 * redirect — so we don't need an `else` branch.
 */
export default async function NewIdeaPage() {
  await requireRole("SUBMITTER");

  return (
    <section className="space-y-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        New idea
      </h1>
      <IdeaSubmissionForm />
    </section>
  );
}
