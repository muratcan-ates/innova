# Contracts: HTTP Routes

**Phase**: 1
**Date**: 2026-05-14

Only **two** HTTP routes exist in Innova. Everything else is a Server
Action (see [`server-actions.md`](./server-actions.md)).

---

## `/api/auth/[...nextauth]` (GET, POST)

**Location**: `app/api/auth/[...nextauth]/route.ts`
**Owner**: Auth.js v5

**Definition**:

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

This is **not** code we write — it's the catch-all Auth.js handler. It
serves every internal Auth.js endpoint (CSRF token, sign-in, sign-out,
callback, session). The contract is defined by Auth.js itself.

**Notes**:

- Requests to this route MUST NOT be intercepted by `middleware.ts`.
- The JWT cookie is named `next-auth.session-token` (dev) /
  `__Secure-next-auth.session-token` (prod). Both are HttpOnly.

---

## `/api/attachments/[id]` (GET)

**Location**: `app/api/attachments/[id]/route.ts`
**Owner**: Innova (custom)
**Spec mapping**: FR-008, FR-014a

This route streams an idea's attachment file from `./uploads/` while
enforcing the audience-mirroring rule from FR-014a.

### Request

`GET /api/attachments/{id}` where `{id}` is the `Idea.id` (NOT the
filename). The filename on disk is intentionally never exposed to the
browser, so guessing one is impossible.

### Authorization rule (from FR-014a)

A response of `200` MUST be returned **only when ALL** of the following
hold:

1. The request carries an active Auth.js session cookie.
2. The session is valid (`auth()` returns a non-null user).
3. `prisma.idea.findUnique({ where: { id } })` finds the idea.
4. `idea.filePath` is not null.
5. The session user is **either** (a) the idea's owning Submitter
   (`idea.submitterId === session.user.id`) **or** (b) any user with role
   `EVALUATOR`.

If **any** of these fail, the route MUST return `404 Not Found` with no
response body — never `401` or `403`, because those leak whether the file
exists. (Edge case in the spec.)

### Response (success)

- Status: `200`
- Headers:
  - `Content-Type` — derived from extension (`application/pdf`,
    `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
  - `Content-Disposition: attachment; filename="<original-filename>"`
    (the part before the UUID prefix in the stored filename — preserved
    in the DB at submission time).
  - `Content-Length` — file size in bytes.
- Body: the raw file bytes streamed via `fs.createReadStream`.

### Response (any failure)

- Status: `404 Not Found`
- Body: empty (or a single `"Not found"` line — never a JSON object with
  fields, never an error stack, never the filename).

### Logging

Every request — success OR 404 — writes one log line:

```text
[INNOVA] 2026-05-14T22:11:43.123Z attachments.get
  ideaId=clxxx requesterId=clyyy role=SUBMITTER outcome=200
```

On `outcome=404`, the same log line is written with the actual reason
(no session / wrong role / not owner / file missing) — but ONLY to the
server console. The HTTP response remains a bare 404.

### Pseudocode

```ts
// app/api/attachments/[id]/route.ts
export async function GET(req, { params }) {
  try {
    const session = await auth();
    if (!session?.user) return new Response("Not found", { status: 404 });

    const idea = await prisma.idea.findUnique({ where: { id: params.id } });
    if (!idea?.filePath) return new Response("Not found", { status: 404 });

    const isOwner = idea.submitterId === session.user.id;
    const isEvaluator = session.user.role === "EVALUATOR";
    if (!isOwner && !isEvaluator) {
      return new Response("Not found", { status: 404 });
    }

    // build absolute path, stream the file
    return new Response(stream, { status: 200, headers });
  } catch (err) {
    console.error("[INNOVA]", new Date().toISOString(),
      "attachments.get", { ideaId: params.id, error: err });
    return new Response("Not found", { status: 404 });
  }
}
```

---

## Middleware

**Location**: `middleware.ts` (project root)

A single middleware enforces the public-vs-authenticated boundary.

**Matcher** (which paths it runs on):

```ts
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ideas/:path*",
    "/api/attachments/:path*",
  ],
};
```

**Behavior**: `auth()` runs first; if there is no session, the middleware
redirects HTML requests to `/login?from=<original-path>` and returns a
404 for the attachment API route (preserving the FR-014a rule even at
the middleware layer).

`/api/auth/*` is **never** matched (Auth.js manages its own routes).
