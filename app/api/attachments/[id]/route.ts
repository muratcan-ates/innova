/*
 * app/api/attachments/[id]/route.ts
 * ====================================================================
 * What this file is: the GET route that streams an idea's attachment
 *   file. The `[id]` segment is the IDEA id (not a filename), so an
 *   attacker cannot guess filenames — they'd have to guess cuid()s,
 *   AND have a valid session, AND own the parent idea (or be an
 *   Evaluator).
 *
 * Why it exists: spec FR-008 + FR-014a. The download MUST 404 on
 *   ANY failure mode (no session, wrong role, wrong owner, no
 *   attachment, file missing on disk). The route MUST NEVER emit
 *   401/403, because those would leak existence of the idea.
 *
 * Read by: any signed-in user clicking the "Download" link on an
 *   idea's detail page (T049).
 * ====================================================================
 */

import path from "node:path";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logError, logInfo } from "@/lib/logger";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

/* MIME types we emit. We rebuild this from the filename extension
 * so the database doesn't have to store the MIME (and stays
 * consistent with the validator's allowed-types list). */
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/* Helper: a bare 404 response with no body details. Reused by every
 * failure branch so the wire format is identical across all
 * "not allowed" cases — preventing timing or content differences
 * that could leak existence. */
function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain" },
  });
}

/*
 * GET
 * --------------------------------------------------------------------
 * Inputs:
 *   - request: the incoming Request (unused; left in the signature
 *     so Next.js's typed routes accept the handler).
 *   - { params }: dynamic `id` from the URL — the Idea id.
 * Outputs: a 200 streaming response with the file bytes on success,
 *   or a bare 404 on any failure.
 * Callers: the browser, via the `Download` link on the detail page.
 *
 * Wrapped in try/catch with `[INNOVA]` logging per Principle IV.
 * Each early-return also writes a log line so the operator can see
 * WHICH branch fired during the demo.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const operation = "attachments.get";

  try {
    // (1) session
    const session = await auth();
    if (!session?.user?.id) {
      logInfo(operation, { ideaId: id, outcome: 404, reason: "no-session" });
      return notFound();
    }

    // (2) load idea
    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea || !idea.filePath) {
      logInfo(operation, { ideaId: id, outcome: 404, reason: "no-idea-or-file" });
      return notFound();
    }

    // (3) access rule — owner OR any Evaluator
    const isOwner = idea.submitterId === session.user.id;
    const isEvaluator = session.user.role === "EVALUATOR";
    if (!isOwner && !isEvaluator) {
      logInfo(operation, {
        ideaId: id,
        requesterId: session.user.id,
        outcome: 404,
        reason: "wrong-audience",
      });
      return notFound();
    }

    // (4) resolve absolute path and stat the file (catches the
    // case where the DB row points to a file that no longer
    // exists on disk).
    const absolutePath = path.join(UPLOADS_DIR, idea.filePath);
    // Defense in depth — make sure the resolved path is still
    // inside UPLOADS_DIR. Belt-and-suspenders over the sanitizer
    // in submit-idea.ts.
    if (!absolutePath.startsWith(UPLOADS_DIR + path.sep)) {
      logInfo(operation, { ideaId: id, outcome: 404, reason: "path-escape" });
      return notFound();
    }
    const fileStat = await stat(absolutePath).catch(() => null);
    if (!fileStat || !fileStat.isFile()) {
      logInfo(operation, { ideaId: id, outcome: 404, reason: "missing-on-disk" });
      return notFound();
    }

    // (5) build response — stream the file bytes with a
    // recognizable Content-Disposition filename.
    const ext = idea.filePath.split(".").pop()?.toLowerCase() ?? "";
    const mime = MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
    const downloadName = idea.fileName ?? "attachment";

    // createReadStream gives us a Node Readable; convert to a Web
    // ReadableStream via the standard helper.
    const nodeStream = createReadStream(absolutePath);
    // Node's stream/web `Readable.toWeb` would be ideal but Next
    // is happy with a ReadableStream wrapping the node stream.
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) =>
          controller.enqueue(
            chunk instanceof Buffer
              ? new Uint8Array(chunk)
              : new TextEncoder().encode(String(chunk)),
          ),
        );
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    logInfo(operation, {
      ideaId: id,
      requesterId: session.user.id,
      role: session.user.role,
      outcome: 200,
    });

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Length": String(fileStat.size),
        "Content-Disposition": `attachment; filename="${downloadName}"`,
      },
    });
  } catch (err) {
    logError(operation, { ideaId: id }, err);
    return notFound();
  }
}
