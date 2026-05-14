/*
 * lib/file-validation.ts
 * ====================================================================
 * What this file is: a single function — `validateAttachment` — that
 *   decides whether a user-uploaded File is acceptable for the
 *   submit-idea Server Action. It checks the size, the filename
 *   extension, AND the file's actual first bytes against the
 *   "magic number" expected for that extension.
 *
 * Why it exists: spec FR-009 demands both an extension check AND a
 *   content-signature check, so an attacker can't rename
 *   `payload.exe` to `payload.pdf` and slip it past the validator.
 *   Two callers depend on this function:
 *     1. `components/idea-submission-form.tsx` — runs it on the
 *        client to give early inline feedback before submission.
 *     2. `server/actions/submit-idea.ts` — re-runs it on the server
 *        before any `fs.writeFile`, because client-side checks are
 *        advisory; the server is the trust boundary.
 *
 *   `validateAttachment` returns a discriminated union so callers
 *   can `if (result.ok)` and TypeScript narrows the rest.
 *
 * Read by: components/idea-submission-form.tsx,
 *   server/actions/submit-idea.ts,
 *   tests/unit/file-validation.test.ts.
 * ====================================================================
 */

/* The single allowed size cap from spec FR-008. Ten mebibytes. */
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/*
 * Allowed extensions. The mapping points at the MIME type the
 * download route (T042) will return in Content-Type, so we
 * compute it once and pass it back to the caller. Lower-case the
 * extension before lookup so `foo.PDF` works.
 */
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx"]);

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/*
 * MAGIC_NUMBERS
 * --------------------------------------------------------------------
 * The first bytes that identify each file format. We compare these
 * to the file's actual bytes — if a `.pdf` doesn't start with
 * `%PDF-`, it's not really a PDF and we reject. This is the second
 * half of FR-009's "validate by extension AND content".
 *
 * The expected values:
 *   - PDF:  "%PDF-"          (25 50 44 46 2D)
 *   - DOC:  OLE2 compound document
 *           (D0 CF 11 E0 A1 B1 1A E1)
 *   - DOCX: ZIP file header
 *           (50 4B 03 04)   — DOCX is technically a zip archive
 */
const MAGIC_NUMBERS: Record<string, number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d],
  doc: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  docx: [0x50, 0x4b, 0x03, 0x04],
};

/* The shape returned by validateAttachment. Discriminated union
 * so callers can branch on `result.ok` and get the right fields. */
export type ValidateAttachmentResult =
  | { ok: true; mime: string; extension: "pdf" | "doc" | "docx" }
  | { ok: false; reason: string };

/*
 * extensionOf
 * --------------------------------------------------------------------
 * Inputs: a filename like "Quarterly Report.PDF".
 * Outputs: the lowercased extension WITHOUT the dot, or "" if there
 *   is no extension at all (e.g. "Makefile").
 * Why a helper: makes `validateAttachment` read more linearly and
 *   keeps the "lowercase + drop dot" rule in one place.
 */
function extensionOf(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) return "";
  return filename.slice(lastDot + 1).toLowerCase();
}

/*
 * bytesStartWith
 * --------------------------------------------------------------------
 * Inputs:
 *   - haystack: a Uint8Array of the file's first chunk.
 *   - needle:   an array of expected bytes (the magic number).
 * Outputs: true iff every byte of `needle` matches the same index
 *   of `haystack`. False otherwise (including if haystack is short).
 * Why a helper: spelled-out byte comparison reads cleanly and the
 *   `for` loop is easier to follow than a chained Array method.
 */
function bytesStartWith(haystack: Uint8Array, needle: number[]): boolean {
  if (haystack.length < needle.length) return false;
  for (let i = 0; i < needle.length; i++) {
    if (haystack[i] !== needle[i]) return false;
  }
  return true;
}

/*
 * validateAttachment
 * --------------------------------------------------------------------
 * Inputs:
 *   - file: a web `File` (from a <input type="file"> or FormData).
 * Outputs: a `ValidateAttachmentResult`. On success the MIME type
 *   and lower-cased extension are returned for the caller to pass
 *   into Content-Type later. On failure the `reason` is a single
 *   sentence safe to show to the user via toast / inline error.
 * Callers:
 *   - components/idea-submission-form.tsx (client-side preflight).
 *   - server/actions/submit-idea.ts (server-side trust boundary).
 *
 * The function is `async` because reading the first bytes of the
 * file requires awaiting an ArrayBuffer.
 */
export async function validateAttachment(
  file: File,
): Promise<ValidateAttachmentResult> {
  // Size check — first because it's free.
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      reason: "File is larger than 10 MB.",
    };
  }
  if (file.size === 0) {
    return {
      ok: false,
      reason: "File is empty.",
    };
  }

  // Extension check — cheap, runs without reading any bytes.
  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      reason: "Only PDF, DOC, or DOCX files are allowed.",
    };
  }

  // Magic-number check — read just the first 8 bytes (max magic
  // number length) instead of the whole file. arrayBuffer() is the
  // standard web-File API method here.
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  // safe to read by ext key — we just verified ext is in the set
  const expectedMagic = MAGIC_NUMBERS[ext]!;
  if (!bytesStartWith(head, expectedMagic)) {
    return {
      ok: false,
      reason:
        "The file's contents do not match its extension (e.g. a renamed .exe). Please upload a real PDF, DOC, or DOCX.",
    };
  }

  // All three checks passed.
  return {
    ok: true,
    mime: MIME_BY_EXTENSION[ext]!,
    extension: ext as "pdf" | "doc" | "docx",
  };
}
