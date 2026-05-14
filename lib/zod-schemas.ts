/*
 * lib/zod-schemas.ts
 * ====================================================================
 * What this file is: the single source of Zod schemas used by both
 *   client-side form validation (react-hook-form + zodResolver) and
 *   server-side Server Action validation. One schema, two callers,
 *   zero drift.
 *
 * Why it exists: spec FR-001/004/007/016/017 each describe the
 *   shape of one input. Encoding each shape as a Zod schema lets
 *   `react-hook-form` show inline errors AND lets Server Actions
 *   re-validate at the trust boundary. `z.infer<typeof schema>`
 *   produces the matching TypeScript type for `react-hook-form`
 *   without us writing one by hand.
 *
 * Read by: every form component under `components/`, every Server
 *   Action under `server/actions/`, and (indirectly) every test
 *   that exercises those actions.
 *
 * The schemas here intentionally stay narrow — only the fields
 * the spec lists, only the constraints the spec gives. No
 * speculative validation, per Constitution Principle I.
 * ====================================================================
 */

import { z } from "zod";

/* -------------------------------------------------------------- */
/* Shared, reusable atoms                                         */
/* -------------------------------------------------------------- */

/* RFC-5321 email format. Zod's built-in `.email()` is good enough
 * for the demo — no need to write a custom regex. */
export const EmailSchema = z
  .string()
  .min(1, "Email is required.")
  .email("Enter a valid email address.");

/* Spec doesn't put a max on password length other than what bcryptjs
 * tolerates (~72 bytes), but a hard 128 cap covers ordinary inputs
 * and rejects garbage. */
export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.");

/* The fixed lists from FR-001 and FR-007. Mirroring Prisma enums
 * here means any drift between schema.prisma and these schemas
 * surfaces at TS compile time. */
export const RoleEnum = z.enum(["SUBMITTER", "EVALUATOR"]);
export const StatusEnum = z.enum([
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
]);
export const CategoryEnum = z.enum([
  "PRODUCT",
  "PROCESS",
  "TECHNOLOGY",
  "CUSTOMER_EXPERIENCE",
  "OTHER",
]);

/* -------------------------------------------------------------- */
/* Per-action schemas                                             */
/* -------------------------------------------------------------- */

/*
 * registerSchema
 * --------------------------------------------------------------------
 * Used by: app/(public)/register/page.tsx (form) and
 *          server/actions/register.ts (Server Action).
 * Matches FR-001.
 */
export const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required.")
    .max(80, "Name is too long."),
  email: EmailSchema,
  password: PasswordSchema,
  role: RoleEnum,
});
export type RegisterInput = z.infer<typeof registerSchema>;

/*
 * loginSchema
 * --------------------------------------------------------------------
 * Used by: app/(public)/login/page.tsx (form).
 * The Server Action equivalent is Auth.js's `authorize()`, which
 * does its own narrowing — so this schema is purely for the form.
 * Matches FR-004.
 */
export const loginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

/*
 * submitIdeaSchema (text fields only)
 * --------------------------------------------------------------------
 * Used by: components/idea-submission-form.tsx and
 *          server/actions/submit-idea.ts.
 * The optional file attachment is validated separately by
 * `lib/file-validation.validateAttachment` (FR-008/FR-009), not
 * here, because Zod doesn't know about magic-byte content checks.
 * Matches FR-007 (5–120 char title, ≤5000 char description, fixed
 * category list).
 */
export const submitIdeaSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters.")
    .max(120, "Title can be at most 120 characters."),
  description: z
    .string()
    .min(1, "Description is required.")
    .max(5000, "Description can be at most 5000 characters."),
  category: CategoryEnum,
});
export type SubmitIdeaInput = z.infer<typeof submitIdeaSchema>;

/*
 * evaluateIdeaSchema
 * --------------------------------------------------------------------
 * Used by: components/evaluation-panel.tsx and
 *          server/actions/evaluate-idea.ts.
 * The "comment required for ACCEPTED/REJECTED" rule (FR-017) lives
 * in the Server Action, not here, because it depends on the value
 * of `newStatus` AND the value of `comment` together — a refinement
 * that's easier to read inline at the action site.
 * Matches FR-016, FR-017.
 */
export const evaluateIdeaSchema = z.object({
  ideaId: z.string().min(1),
  newStatus: StatusEnum,
  comment: z
    .string()
    .max(5000, "Comment can be at most 5000 characters.")
    .optional()
    .default(""),
});
export type EvaluateIdeaInput = z.infer<typeof evaluateIdeaSchema>;
