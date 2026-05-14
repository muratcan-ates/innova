/*
 * tests/unit/file-validation.test.ts
 * ====================================================================
 * What this file is: a Vitest unit test for `validateAttachment` in
 *   lib/file-validation.ts.
 *
 * Why it exists: spec FR-009 calls out the `.pdf.exe` disguised-file
 *   attack by name. The function under test is the only guard
 *   between an attacker-controlled filename + bytes and our
 *   filesystem. Pinning its behavior in tests is cheap insurance.
 *
 * Cases covered (the four operator-approved checks):
 *   1. A valid PDF (correct extension + correct magic bytes) passes.
 *   2. A valid DOCX passes.
 *   3. A `.pdf.exe` (PDF extension, EXE/MZ magic bytes) is rejected.
 *   4. An 11 MB file (correct contents, oversized) is rejected.
 *
 * NOT covered (deliberate scope cap): client-side widget behavior,
 *   integration with the submit-idea action, edge cases like
 *   zero-byte files (already handled inline in validateAttachment,
 *   not retested here).
 *
 * Run by: `npm run test`.
 * ====================================================================
 */

import { describe, it, expect } from "vitest";
import { validateAttachment } from "@/lib/file-validation";

/*
 * makeFile
 * --------------------------------------------------------------------
 * Inputs:
 *   - name:  the filename (used by the extension check).
 *   - bytes: the byte array the test wants this file to start with.
 *   - totalSize: optional. If provided, the file is padded with
 *     zero bytes to this length (used for the oversize case).
 * Outputs: a web `File` instance the validator can consume.
 * Why a helper: keeps each test case to a single readable line and
 *   centralizes the (slightly fiddly) Uint8Array → Blob → File dance.
 */
function makeFile(
  name: string,
  bytes: number[],
  totalSize?: number,
): File {
  // Wrap the Uint8Array in a Blob first to side-step a TS narrowing
  // quirk where `new File([uint8array], …)` complains about
  // ArrayBufferLike vs ArrayBuffer. The runtime behavior is the same.
  const head = new Uint8Array(bytes);
  let buffer: Uint8Array;
  if (totalSize !== undefined && totalSize > bytes.length) {
    buffer = new Uint8Array(totalSize);
    buffer.set(head, 0);
  } else {
    buffer = head;
  }
  // Cast to BlobPart to side-step a TS narrowing quirk in the DOM
  // lib (Uint8Array<ArrayBufferLike> vs Uint8Array<ArrayBuffer>).
  // The actual buffer here is always a fresh, owned ArrayBuffer.
  const blob = new Blob([buffer as BlobPart]);
  return new File([blob], name);
}

describe("validateAttachment", () => {
  it("accepts a valid PDF", async () => {
    // The first 5 bytes of every PDF are "%PDF-".
    const file = makeFile(
      "Quarterly Report.pdf",
      [0x25, 0x50, 0x44, 0x46, 0x2d],
    );
    const result = await validateAttachment(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Narrowed by the discriminated-union return type.
      expect(result.mime).toBe("application/pdf");
      expect(result.extension).toBe("pdf");
    }
  });

  it("accepts a valid DOCX", async () => {
    // DOCX is technically a ZIP archive — first 4 bytes are PK\x03\x04.
    const file = makeFile(
      "Innovation Pitch.docx",
      [0x50, 0x4b, 0x03, 0x04],
    );
    const result = await validateAttachment(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mime).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      expect(result.extension).toBe("docx");
    }
  });

  it("rejects a .pdf.exe (PDF extension, EXE magic bytes)", async () => {
    // The filename has a .pdf extension (extension check would pass)
    // but the bytes are an MZ executable header. This is exactly the
    // disguised-file attack spec FR-009 calls out.
    const file = makeFile(
      "payload.pdf",
      [0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00],
    );
    const result = await validateAttachment(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      // The reason should mention the mismatch so the operator can
      // see it in the toast / inline error.
      expect(result.reason.toLowerCase()).toMatch(/contents|mismatch|match/);
    }
  });

  it("rejects a file larger than 10 MB even if the contents are valid", async () => {
    // Build an 11 MB buffer with a real PDF magic prefix. The size
    // check should kick in before the magic-number check has a
    // chance to be satisfied.
    const ELEVEN_MB = 11 * 1024 * 1024;
    const file = makeFile(
      "huge.pdf",
      [0x25, 0x50, 0x44, 0x46, 0x2d],
      ELEVEN_MB,
    );
    const result = await validateAttachment(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason.toLowerCase()).toMatch(/10 mb|larger|size/);
    }
  });
});
