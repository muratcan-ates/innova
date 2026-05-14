/*
 * lib/action-result.ts
 * ====================================================================
 * What this file is: the single result shape every Server Action in
 *   Innova returns. A discriminated union of `ok: true` (with typed
 *   data) or `ok: false` (with a user-facing error message and an
 *   optional per-field error map).
 *
 * Why it exists: every form in the app handles success and failure
 *   the same way — toast on error, redirect on success, inline
 *   field errors when present. Standardizing the result shape means
 *   the form components can do `if (result.ok)` and TypeScript
 *   narrows the rest automatically; no client-side duck typing.
 *
 * Read by: every Server Action under `server/actions/`, every form
 *   component that invokes one.
 *
 * Generic `T` defaults to `void` so actions with no payload (like
 * `evaluateIdea`) can write `ActionResult` without specifying it.
 * ====================================================================
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      // Per-field error map keyed by Zod field name. Optional because
      // some failures (e.g. transition-not-allowed) aren't tied to
      // a specific input.
      fieldErrors?: Record<string, string>;
    };
