/*
 * server/actions/submit-idea.ts
 * ====================================================================
 * What this file is: the Server Action that creates a new Idea
 *   (optionally with an uploaded attachment). Invoked from the
 *   form on `app/(app)/ideas/new/page.tsx`.
 *
 * Why it exists: spec US-3 + FR-007/008/009/010. This is the core
 *   write path of the application — every idea in the database
 *   was either created by this action OR by `prisma/seed.ts`.
 *
 * Shape: the canonical 5-step Server Action skeleton —
 *   (1) session check    — `requireRole("SUBMITTER")`.
 *   (2) role check       — same call.
 *   (3) Zod validate     — `submitIdeaSchema` (text fields) +
 *                          `validateAttachment` (file).
 *   (4) DB write         — `fs.mkdir` + `fs.writeFile` + Prisma create
 *                          inside a transaction.
 *   (5) revalidate       — `/ideas/mine`, `/dashboard`.
 *
 * Spec mapping: FR-007, FR-008, FR-009, FR-010, FR-023, US-3.
 *
 * Read by: components/idea-submission-form.tsx (T040).
 * ====================================================================
 */

"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";
import { requireRole } from "@/lib/auth-helpers";
import { submitIdeaSchema } from "@/lib/zod-schemas";
import { validateAttachment } from "@/lib/file-validation";
import type { ActionResult } from "@/lib/action-result";

/* Where attachments live. Relative to the project root. Outside
 * `public/` so static-file serving can't accidentally leak them
 * (spec FR-014a — the auth-gated download route in T042 is the
 * ONLY way to fetch a file). */
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

/*
 * sanitizeFilename
 * --------------------------------------------------------------------
 * Inputs: a user-supplied filename (untrusted).
 * Outputs: a safe filename — strips path separators and parent-dir
 *   refs, collapses whitespace, trims to 100 chars. The on-disk
 *   filename will still be prefixed with a UUID, but a clean
 *   original-name half makes downloads readable.
 * Why: defense in depth — even though the UUID prefix makes
 *   collisions impossible, an unsanitized name in the
 *   `Content-Disposition` header could break the download UI on
 *   some browsers.
 */
function sanitizeFilename(name: string): string {
  // Remove path segments. `path.basename` does this on the current
  // platform; we also strip backslashes for Windows-style names.
  const base = path.basename(name.replace(/\\/g, "/"));
  // Replace whitespace runs and anything outside a conservative
  // safe-character set with single dashes; trim to 100 chars.
  return (
    base
      .replace(/\s+/g, "-")
      .replace(/[^A-Za-z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 100) || "file"
  );
}

/*
 * submitIdea
 * --------------------------------------------------------------------
 * Inputs:
 *   - formData: title, description, category, optional file.
 * Outputs: ActionResult<{ ideaId }>. On success the calling form
 *   routes to /ideas/<ideaId>.
 * Callers: components/idea-submission-form.tsx.
 *
 * Wrapped in try/catch with `[INNOVA]` logging per Principle IV.
 */
export async function submitIdea(
  formData: FormData,
): Promise<ActionResult<{ ideaId: string }>> {
  const operation = "submitIdea";

  try {
    // (1) + (2) session + role check.
    const user = await requireRole("SUBMITTER");

    // (3a) text-field validation via Zod.
    const raw = {
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
    };
    const parsed = submitIdeaSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors,
      };
    }
    const { title, description, category } = parsed.data;

    // (3b) optional file validation via `validateAttachment`. The
    // form field uses name="file". An absent or zero-size file is
    // treated as "no attachment" — the user didn't pick one.
    const fileEntry = formData.get("file");
    let filePath: string | null = null;
    let fileName: string | null = null;

    if (fileEntry instanceof File && fileEntry.size > 0) {
      const fileResult = await validateAttachment(fileEntry);
      if (!fileResult.ok) {
        return {
          ok: false,
          error: "Attachment was rejected.",
          fieldErrors: { file: fileResult.reason },
        };
      }

      // (4a) write the file to ./uploads/. mkdir is idempotent
      // with { recursive: true } — safe to call on every submit.
      await mkdir(UPLOADS_DIR, { recursive: true });
      const safeOriginal = sanitizeFilename(fileEntry.name);
      const onDiskName = `${randomUUID()}-${safeOriginal}`;
      const absolutePath = path.join(UPLOADS_DIR, onDiskName);

      const bytes = Buffer.from(await fileEntry.arrayBuffer());
      await writeFile(absolutePath, bytes);

      // Store the RELATIVE path (just the filename); the download
      // route resolves it against UPLOADS_DIR at read time. Keeps
      // the DB row portable if the project moves.
      filePath = onDiskName;
      fileName = safeOriginal;
    }

    // (4b) create the Idea row. Wrapped in a transaction so a
    // future expansion (e.g. recording a "Submitted" event) can
    // ride the same atomic boundary without a refactor.
    const idea = await prisma.$transaction(async (tx) => {
      return tx.idea.create({
        data: {
          title,
          description,
          category,
          status: "SUBMITTED",
          submitterId: user.id,
          filePath,
          fileName,
        },
      });
    });

    logInfo(operation, {
      ideaId: idea.id,
      submitterId: user.id,
      hasAttachment: filePath !== null,
    });

    // (5) revalidate the two lists this idea now appears on.
    revalidatePath("/ideas/mine");
    revalidatePath("/dashboard");

    return { ok: true, data: { ideaId: idea.id } };
  } catch (err) {
    // requireRole throws a NEXT_REDIRECT internally — we let those
    // propagate (the framework consumes them). All other errors
    // become a generic "try again" toast.
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;

    logError(
      operation,
      {
        title: typeof formData.get("title") === "string"
          ? (formData.get("title") as string).slice(0, 40)
          : null,
      },
      err,
    );
    return {
      ok: false,
      error: "Something went wrong while saving your idea. Please try again.",
    };
  }
}
