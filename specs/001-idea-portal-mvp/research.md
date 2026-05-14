# Research: Innova MVP — Library & Stack Justifications

**Phase**: 0
**Date**: 2026-05-14
**Status**: All decisions resolved; no NEEDS CLARIFICATION items remain.

This document records *why* each library on the constitution's locked stack
is the right choice for Innova specifically. The decisions themselves are
binding via Constitution Principle II — this file exists so a non-technical
reviewer can defend each pick to a jury.

---

## Decision: Next.js 15 (App Router) + React 19

**Decision**: Use Next.js 15 with the App Router for the whole application.

**Rationale**: Next.js gives us pages, API routes, **Server Actions**, and a
production-ready dev server in a single dependency. Server Actions let us
write mutations as ordinary TypeScript functions on the server with end-to-
end type safety — no parallel REST API to maintain. The App Router's route
groups (`(public)` vs `(app)`) let us swap layouts (no-sidebar vs sidebar)
without conditionals. React 19 ships with built-in `useFormState` /
`useFormStatus` hooks that pair cleanly with Server Actions.

**Alternatives considered**:

- **Remix**: similar capabilities, smaller ecosystem of pre-built admin
  blocks. shadcn/ui targets Next.js first.
- **SvelteKit / Astro**: would force us to give up shadcn/ui and the
  Auth.js Credentials provider works better in Next.

---

## Decision: TypeScript

**Decision**: TypeScript strict mode for the whole project.

**Rationale**: A one-night build leaves no time for runtime type bugs.
TypeScript catches `session.user.role` typos before the page reloads, and
plays directly into Zod's `z.infer<>` for form contracts.

**Alternatives considered**: Plain JavaScript — rejected; the cost of catching
even one auth-role typo at runtime would exceed the cost of `tsc` setup.

---

## Decision: Prisma ORM + SQLite

**Decision**: Prisma with a SQLite provider at `./prisma/dev.db`.

**Rationale**: Prisma generates a fully-typed client from the schema, so
`prisma.idea.findMany({ where: { submitterId } })` is type-checked end-to-end.
SQLite is a single file with zero setup — perfect for a local-only demo with
seed data. `prisma migrate dev` regenerates the DB from scratch in seconds,
which is exactly what `npm run db:reset` needs.

**Alternatives considered**:

- **Drizzle**: faster, but less Next-ecosystem documentation and no
  built-in seed/migrate workflow as smooth as Prisma's.
- **Postgres in Docker**: violates Principle I (one process, no Docker).

---

## Decision: Auth.js v5 (`next-auth@beta`) + Credentials provider + JWT sessions

**Decision**: Auth.js v5 with **only** the Credentials provider and
`session: { strategy: "jwt" }`.

**Rationale**: The spec needs email + password login with a role attached
to the session — Credentials is the exact match. Auth.js v5 documents
explicitly that **database sessions are unsupported with the Credentials
provider**: attempting that pairing silently returns nulls on `auth()` calls
in some environments. JWT sessions store the user id and role on the token
and survive page reloads with no database round-trip.

**Alternatives considered**:

- **Custom session cookie + bcrypt**: more code, identical behavior, no
  benefit.
- **Database sessions with Credentials**: broken on Auth.js v5 — would
  cost hours of debugging tonight.
- **Clerk / Auth0**: external dependency, paid plan, network round-trips
  in the demo, violates "local-only".

---

## Decision: `bcryptjs` (NOT `bcrypt`)

**Decision**: Use `bcryptjs` — a pure-JavaScript implementation.

**Rationale**: `bcrypt` (the native one) requires a compile step against
`node-gyp` that frequently fails on macOS upgrades and on Apple Silicon, and
breaks Next.js's edge runtime. `bcryptjs` is ~30% slower, which is invisible
at our scale (5 logins total in the demo). It "just installs."

**Alternatives considered**: `argon2` — better algorithm but native build
problems too; `scrypt` from Node's `crypto` — requires hand-rolling salt
storage, no library wrapper.

---

## Decision: Tailwind CSS v4 + shadcn/ui (`new-york` style)

**Decision**: Tailwind v4 with shadcn/ui's `new-york` registry, dark mode
default.

**Rationale**: Tailwind v4's CSS-first config means the theme tokens
(`--background`, `--foreground`, `--accent`) live in `globals.css` and are
applied by every shadcn component automatically. The `new-york` variant
ships compact spacing and clean borders that match the constitutional
references (Linear, Vercel, Raycast). shadcn primitives are *copied into*
the repo (`components/ui/*`), so we own and can tweak them — no upstream
breaking changes can land mid-demo.

**Alternatives considered**: Mantine, Chakra — both ship as runtime deps
with their own theming layer and would conflict with the constitutional
typography rules.

---

## Decision: shadcn/ui components to install up front

**Decision**: Install via CLI in one batch before writing any feature code:

```bash
npx shadcn@latest add button card input label textarea select \
  dialog dropdown-menu table badge sonner skeleton form sidebar data-table
```

**Rationale**: Pre-installing every primitive Principle VIII will need means
zero context-switching during implementation. The full list maps to the spec:

| Primitive | Spec Reference |
|---|---|
| button, input, label, form | All forms (register, login, submit, evaluate) |
| card | Landing hero blocks (FR-025), idea detail, dashboard stat cards |
| textarea | Idea description, evaluation comment |
| select | Category select (FR-007), status filter (FR-013) |
| dropdown-menu | User menu in sidebar |
| table, data-table | All-ideas list (FR-012, FR-013), sortable per FR-024 |
| badge | Status badge (FR-021) |
| sonner | Toast notifications (FR-023) |
| skeleton | Loading states (Principle VIII forbids spinners) |
| dialog | Confirm dialogs (e.g. logout, transition errors) |
| sidebar | Authenticated layout (FR-026) |

---

## Decision: `sonner` for toasts

**Decision**: Use the `sonner` toast library, mounted once at root.

**Rationale**: Principle VIII forbids `alert()` and the spec requires toast
feedback on every form (FR-023). `sonner` ships with the shadcn registry,
animates by default, and is one `<Toaster />` mount. It's also explicitly
on the constitution's locked list.

**Alternatives considered**: `react-hot-toast` — not on the locked list,
no benefit over sonner.

---

## Decision: `lucide-react` for icons

**Decision**: Use `lucide-react` for every icon.

**Rationale**: shadcn/ui examples use Lucide. Single icon set keeps the
aesthetic coherent (Principle VII). Tree-shaken per icon.

**Alternatives considered**: Heroicons — different visual weight, would
break aesthetic consistency.

---

## Decision: `react-hook-form` + `zod`

**Decision**: All forms use `react-hook-form` with `zod` validation via
`@hookform/resolvers/zod`.

**Rationale**: shadcn's `Form` primitive is *built around* `react-hook-form`.
Zod schemas double as input validation **and** can be imported by Server
Actions for runtime validation — one source of truth. `z.infer<>` produces
the TypeScript type for the form values automatically.

**Alternatives considered**: Formik — older, no Zod-first story, not what
shadcn ships with. Plain `<form>` + manual validation — wastes a night.

---

## Decision: Framer Motion (one animation only)

**Decision**: Use `framer-motion` for a single stagger animation on the
landing page's three feature cards.

**Rationale**: Constitution Principle II caps Framer Motion at one
page-load stagger. The landing page's three cards are the moment that needs
visual polish for the jury; nowhere else.

**Alternatives considered**: CSS `@keyframes` stagger — possible, but
Framer's `staggerChildren` is one line. None on any other page.

---

## Decision: `crypto.randomUUID()` for upload filenames

**Decision**: Generate filenames as
`${crypto.randomUUID()}-${sanitizedOriginalName}`.

**Rationale**: Built into Node 20 — no library needed. UUID prefix
guarantees no collisions even if two users upload `report.pdf` at the
same time. The original filename is preserved (sanitized) so an Evaluator
downloading the file sees a recognizable name.

**Alternatives considered**: `nanoid` — extra dependency for the same
guarantee. Hashing the file — breaks "same name twice = same hash" and
loses the original name.

---

## Decision: Server Actions as the only mutation transport

**Decision**: All writes go through Server Actions in `server/actions/*`.
The only HTTP routes are `/api/auth/[...nextauth]` (required by Auth.js)
and `/api/attachments/[id]` (required because file downloads can't be a
Server Action).

**Rationale**: One transport means one error-handling pattern, one
validation pattern, one logging pattern. End-to-end TypeScript types from
form → action → DB. `revalidatePath` keeps the relevant lists fresh
without manual cache invalidation. Per Principle I, this is the smallest
shape that works.

**Alternatives considered**: Building parallel REST routes — doubles the
surface area, requires hand-typed request/response shapes.

---

## Decision: File validation by extension AND content signature

**Decision**: Before any `fs.writeFile`, validate that:

1. The filename extension is in `{.pdf, .doc, .docx}`.
2. The file's first bytes match the expected "magic number":
   - PDF → `%PDF-` (`25 50 44 46 2D`)
   - DOC → `D0 CF 11 E0 A1 B1 1A E1` (OLE2)
   - DOCX → `50 4B 03 04` (ZIP header — DOCX is a zip)
3. The reported size and the actual byte length agree, and both are ≤10 MB.

Any mismatch returns a clear toast error and writes nothing.

**Rationale**: FR-009 explicitly calls out the `.pdf.exe` disguised-file
attack. Extension alone is trivially spoofed; content alone misses the
case where Windows would execute by extension regardless. Both together
is the defensive minimum.

**Alternatives considered**: A library like `file-type` — extra dep for
three magic numbers we can hand-check in ~10 lines.

---

## Decision: Vitest for 3 unit tests on pure logic

**Decision**: Use Vitest as the unit test runner. Exactly **three** tests
under `tests/unit/`:

1. `transitions.test.ts` — verifies `isAllowedTransition` returns `true`
   for every allowed edge in FR-016 and `false` for representative
   denied pairs (e.g. `SUBMITTED → ACCEPTED`).
2. `file-validation.test.ts` — verifies `validateAttachment` accepts a
   valid PDF, accepts a valid DOCX, rejects a `.pdf.exe` disguise
   (extension passes, magic bytes don't), and rejects a buffer ≥10 MB.
3. `auth-helpers.test.ts` — verifies `requireRole` throws/returns the
   right shape when (a) no session, (b) wrong role, (c) matching role.

**Rationale**: Three places in the code are pure functions where a wrong
answer would silently corrupt the demo: the transition graph, the file
validator, and the role guard. Each is small, fast, and has obvious
input/output, so a Vitest test costs ~5 minutes to write and pays off
forever. Operator explicitly approved this scope as part of `/speckit-plan`.

**Out of scope (and STAY out)**: component tests, snapshot tests, API
contract tests, store mocks. Anything that requires React Testing
Library is off-limits for the MVP — the demo cost outweighs the catch
rate at this scale.

**Alternatives considered**: Jest — fine, but Vitest has zero-config TS
support and runs ~3× faster, which matters when running locally during
implementation.

---

## Decision: Playwright for ONE end-to-end test (the critical path)

**Decision**: Use `@playwright/test` with default Chromium-only config.
Exactly **one** spec file: `e2e/critical-path.spec.ts`. It performs:

1. Visit `/login`, sign in as `alice@innova.local` / `alice123`.
2. Navigate to `/ideas/new`, fill in title + description + category
   (no attachment), submit.
3. Assert redirect to `/ideas/<id>` and badge text "Submitted".
4. Sign out.
5. Sign in as `admin@innova.local` / `admin123`.
6. Open the same idea, select `UNDER_REVIEW` from the status Select,
   submit.
7. Assert the badge now reads "Under Review" and the timeline has one
   new row attributed to Admin.

**Rationale**: This single test exercises the join points that would
otherwise need a half-dozen manual demos to verify: registration/login
flow, role-aware UI, Server Action wiring, status transition graph,
list invalidation, and visual badge update. If this spec passes on a
clean DB, the demo is highly likely to survive the jury walk-through.
Operator explicitly approved this scope as part of `/speckit-plan`.

**Out of scope (and STAY out)**: cross-browser matrix (Firefox / WebKit),
mobile viewport runs, visual snapshots, attachment-upload happy path,
404-leakage assertions (those would be caught by the audience-mirroring
Vitest test if we added one later — not for MVP).

**Alternatives considered**: Cypress — heavier install, slower, and the
Auth.js JWT cookie pattern is documented better in Playwright's
`storageState` recipes.

---

## Decision: Status transition graph encoded as a single helper

**Decision**: `lib/transitions.ts` exports
`isAllowedTransition(from, to)` and `getAllowedTargets(from)`. The
Evaluator UI uses `getAllowedTargets` to populate the Select dropdown;
the Server Action calls `isAllowedTransition` defensively before writing.

**Rationale**: Two callers (UI + Server Action), one source of truth.
Encoding the graph as data (a `Record<Status, Status[]>`) makes the spec's
transition list (per FR-016) readable at a glance.

**Alternatives considered**: A state machine library like `xstate` —
massive overkill for six edges.

---

## Resolved Spec Ambiguities (from `/speckit-clarify`)

| # | Clarification | Implementation Impact |
|---|---|---|
| 1 | Status transitions are strict linear with reopen | `lib/transitions.ts` + server-side enforcement in `evaluate-idea` action |
| 2 | Attachments are auth-gated and audience-mirroring | `/api/attachments/[id]/route.ts` returns 404 for anyone not (owner OR Evaluator) |
| 3 | Submitter ideas are read-only after submission | No edit/delete Server Action exists; no UI controls rendered for Submitters |
| 4 | Dashboard is a real page with stats cards | `app/(app)/dashboard/page.tsx` renders role-specific stat aggregations |
| 5 | Evaluation events are fully immutable | No update/delete Server Action exists; no UI for editing past comments |

---

## NEEDS CLARIFICATION

**None.** All ambiguities were resolved during `/speckit-clarify`. The
plan can advance to Phase 1 / Phase 2 without re-opening any decision.
