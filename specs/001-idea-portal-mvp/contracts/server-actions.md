# Contracts: Server Actions

**Phase**: 1
**Date**: 2026-05-14
**Location at runtime**: `server/actions/*.ts`

Every mutation in Innova is a Next.js **Server Action**. Each action follows
the same five-step skeleton (the "shape" referenced in `plan.md`):

1. **Session check** — `const session = await auth();` then bail if no
   user.
2. **Role check** — confirm `session.user.role` matches what the action
   requires.
3. **Zod validation** — parse the incoming `FormData` against the action's
   Zod schema. Type-narrow the input.
4. **Prisma transaction** — run all DB writes inside `prisma.$transaction`
   so partial failures roll back cleanly.
5. **`revalidatePath`** + return typed result — invalidate every list that
   could now be stale; return `{ ok: true, … }` or `{ ok: false, error }`.

Every action is wrapped in `try`/`catch`. On `catch`, log via the
`[INNOVA]` logger (operation name, sanitized inputs, full error, ISO
timestamp) and return `{ ok: false, error: "Something went wrong" }`.

## Common Result Type

```ts
// lib/action-result.ts
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
```

`fieldErrors` carries per-field validation messages so the form can
display inline errors next to the right input.

---

## `registerUser(formData: FormData): Promise<ActionResult<{ userId: string }>>`

**Allowed callers**: anyone (no session required).

**Inputs (Zod)**:

```ts
z.object({
  name:     z.string().min(1).max(80),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
  role:     z.enum(["SUBMITTER", "EVALUATOR"]),
})
```

**Behavior**:

1. Parse + validate FormData.
2. `passwordHash = await bcryptjs.hash(password, 10)`.
3. `prisma.user.create({...})`.
4. On unique-constraint violation on `email`, return
   `{ ok: false, error: "This email is already registered.", fieldErrors: { email: "..." } }`.
5. On success, sign the user in via `signIn("credentials", { email, password, redirect: false })`
   so the JWT cookie is set on the same response.
6. `revalidatePath("/dashboard")`.

**Returns**: `{ ok: true, data: { userId } }` on success.

**Spec mapping**: FR-001, FR-002, FR-003.

---

## `submitIdea(formData: FormData): Promise<ActionResult<{ ideaId: string }>>`

**Allowed callers**: SUBMITTER only. EVALUATOR receives
`{ ok: false, error: "Only Submitters can create ideas." }`.

**Inputs (Zod)**:

```ts
z.object({
  title:       z.string().min(5).max(120),
  description: z.string().min(1).max(5000),
  category:    z.enum([
    "PRODUCT", "PROCESS", "TECHNOLOGY",
    "CUSTOMER_EXPERIENCE", "OTHER",
  ]),
  // file is a Web File from FormData; null when no attachment
  file: z.instanceof(File).optional(),
})
```

**Behavior**:

1. Session + role check.
2. Zod validate text fields.
3. If `file` present:
   - Check `file.size <= 10 * 1024 * 1024` (10 MB).
   - Check extension in `{.pdf, .doc, .docx}`.
   - Read first 8 bytes; check magic number matches the extension
     (PDF `%PDF-`, DOC `D0 CF 11 E0 A1 B1 1A E1`, DOCX `50 4B 03 04`).
   - Reject on any mismatch with a clear `fieldErrors.file` message.
   - Write to `./uploads/${crypto.randomUUID()}-${sanitizedOriginalName}`.
4. `prisma.idea.create({ ... status: "SUBMITTED", filePath: ... ?? null })`
   inside `prisma.$transaction`.
5. `revalidatePath("/ideas/mine")` and `revalidatePath("/dashboard")`.

**Returns**: `{ ok: true, data: { ideaId } }`; the page redirects to
`/ideas/${ideaId}` on success.

**Spec mapping**: FR-007, FR-008, FR-009, FR-010, FR-023, US-3.

---

## `evaluateIdea(formData: FormData): Promise<ActionResult>`

**Allowed callers**: EVALUATOR only. SUBMITTER (even on their own idea)
receives `{ ok: false, error: "Only Evaluators can change status." }`.

**Inputs (Zod)**:

```ts
z.object({
  ideaId:   z.string().min(1),
  newStatus: z.enum([
    "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED",
  ]),
  comment:  z.string().max(5000).optional().default(""),
})
```

**Behavior**:

1. Session + role check.
2. Zod validate.
3. Load `idea` and read `priorStatus = idea.status`.
4. `if (!isAllowedTransition(priorStatus, newStatus))` →
   `{ ok: false, error: "Transition not allowed." }` (FR-016).
5. `if ((newStatus === "ACCEPTED" || newStatus === "REJECTED") && comment.trim().length === 0)` →
   `{ ok: false, error: "A comment is required when accepting or rejecting an idea.", fieldErrors: { comment: "..." } }` (FR-017).
6. Inside `prisma.$transaction`:
   - `prisma.evaluation.create({ ideaId, evaluatorId, priorStatus, newStatus, comment })`
   - `prisma.idea.update({ where: { id }, data: { status: newStatus } })`
7. `revalidatePath("/ideas/${ideaId}")`, `revalidatePath("/ideas")`,
   `revalidatePath("/dashboard")`.

**Returns**: `{ ok: true }`.

**Spec mapping**: FR-016, FR-017, FR-018, FR-018a, FR-020, US-6.

---

## Actions That DELIBERATELY Do Not Exist

These are referenced for completeness — if a future developer looks for
them, they'll find this note explaining why they were never written:

- **`editIdea`** — no such action. FR-019a forbids Submitters from editing
  their own ideas. The Submission form is the only Submitter-write path.
- **`deleteIdea`** — no such action. Same reason as above.
- **`editEvaluation`** / **`deleteEvaluation`** — no such actions. FR-018a
  makes the audit history append-only.

---

## Error Logging Contract

Every `catch` block writes one line via the `[INNOVA]` logger:

```ts
console.error("[INNOVA]", new Date().toISOString(), "evaluateIdea", {
  ideaId,
  newStatus,
  // never the full session — just userId
  evaluatorId: session.user.id,
  error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
});
```

Per Principle IV. No log libraries.
