/*
 * lib/logger.ts
 * ====================================================================
 * What this file is: the only log helpers Innova uses. Two functions:
 *   - logInfo(operation, context)   → console.log with [INNOVA] prefix
 *   - logError(operation, context, error) → console.error with the same
 *
 * Why it exists: Constitution Principle IV (Observability) requires
 *   that every Server Action, route handler, and external call wrap
 *   its work in try/catch and log on failure with:
 *     1. operation name
 *     2. sanitized inputs (NEVER raw passwords)
 *     3. full error
 *     4. ISO timestamp
 *   …all prefixed with `[INNOVA]` so a `grep [INNOVA]` in the
 *   terminal during the demo surfaces every failure path instantly.
 *
 *   The principle also forbids log libraries. Plain console.log /
 *   console.error are the canonical transport.
 *
 * Read by: every Server Action, every API route, anywhere a `catch`
 *   needs to record the failure.
 *
 * Callers MUST pass a SANITIZED context object. Never pass the raw
 * password from a form, never pass full session objects, never pass
 * raw file buffers. Pass userIds, ideaIds, lengths, error messages.
 * ====================================================================
 */

/*
 * formatTimestamp
 * --------------------------------------------------------------------
 * Inputs: none.
 * Outputs: an ISO 8601 timestamp string in UTC, e.g.
 *   "2026-05-15T22:34:01.123Z".
 * Why ISO and why UTC: Principle IV mandates ISO format so log lines
 *   sort lexicographically; UTC avoids the demo-machine timezone
 *   surprising the jury reader.
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/*
 * logInfo
 * --------------------------------------------------------------------
 * Inputs:
 *   - operation: short verb-or-noun string identifying the action,
 *     e.g. "registerUser", "submitIdea", "attachments.get".
 *   - context: a plain object of key→value pairs the operator may
 *     want to see in the terminal. MUST be sanitized.
 * Outputs: writes one line to stdout (console.log).
 * Callers: route handlers and Server Actions on the SUCCESS path
 *   when surfacing the outcome is useful. Use sparingly — info logs
 *   compete with error logs for the operator's attention.
 */
export function logInfo(
  operation: string,
  context: Record<string, unknown> = {},
): void {
  console.log("[INNOVA]", formatTimestamp(), operation, context);
}

/*
 * logError
 * --------------------------------------------------------------------
 * Inputs:
 *   - operation: short identifier of the action that failed.
 *   - context: sanitized key→value object (userId, ideaId, etc.).
 *   - error: the thrown error itself — typically an `unknown` from a
 *     `catch` block. The helper normalizes it to a readable shape
 *     ({ message, stack }) if it's an Error, otherwise stringifies.
 * Outputs: writes one line to stderr (console.error).
 * Callers: EVERY `catch` block in every Server Action and route
 *   handler. There are no exceptions to this rule in Innova.
 */
export function logError(
  operation: string,
  context: Record<string, unknown>,
  error: unknown,
): void {
  // Normalize the error so the output is consistent whether the
  // catch block caught an Error, a string, or some other thrown value.
  const normalizedError =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { value: String(error) };

  console.error("[INNOVA]", formatTimestamp(), operation, {
    ...context,
    error: normalizedError,
  });
}
