---

description: "Task list for Innova MVP — idea submission & evaluation portal"
---

# Tasks: Innova MVP — Idea Submission & Evaluation Portal

**Input**: Design documents from `/specs/001-idea-portal-mvp/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Operator-approved scope — three Vitest unit tests on pure logic and one Playwright critical-path spec. NO component tests, NO snapshot tests, NO API contract tests.

**Organization**: Tasks are grouped by user story. Phases 1–2 (Setup + Foundational) block everything; phases 3–10 are user-story slices and can be tested independently; phase 11 is final polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies)
- **[Story]**: User story this task belongs to (US1–US7) — only on user-story phases
- Every task names an exact file path so it can be picked up cold
- **Done = committed**: per Constitution Principle IX, each task ends with its own conventional-commit (`feat:` / `fix:` / `chore:` / `docs:` / `test:`)

## Path Conventions (from plan.md)

- Single Next.js project at repo root (no apps/ or packages/ split)
- App Router groups: `app/(public)/`, `app/(app)/`
- Mutations: `server/actions/*.ts`
- Library code: `lib/*.ts`
- Prisma: `prisma/schema.prisma`, `prisma/seed.ts`
- Tests: `tests/unit/*.test.ts` (Vitest) and `e2e/*.spec.ts` (Playwright)

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Get the Next.js project scaffolded, dependencies installed, and configs in place. No feature code in this phase.

- [x] T001 Initialize Next.js 15 App Router + TypeScript project at repo root using `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*"` (interactively or via flags); commit baseline. **DONE 2026-05-14**: pinned to `create-next-app@15` after `@latest` shipped Next.js 16 (constitution violation). Scaffolded to `/tmp/innova-scaffold`, copied non-conflicting files in, merged `.gitignore`. Verified with `npm run build` — 5 static pages, no errors. Next 15.5.18, React 19.1.0, Tailwind v4.
- [x] T002 [P] Install runtime dependencies: `npm install next-auth@beta @auth/prisma-adapter prisma @prisma/client bcryptjs sonner lucide-react react-hook-form zod @hookform/resolvers framer-motion`. **DONE 2026-05-14**: 11 runtime deps installed. Versions: next-auth 5.0.0-beta.31, @prisma/client 7.8.0, prisma 7.8.0, bcryptjs 3.0.3, sonner 2.0.7, lucide-react 1.16.0, react-hook-form 7.75.0, zod 4.4.3, @hookform/resolvers 5.2.2, framer-motion 12.38.0, @auth/prisma-adapter 2.11.2.
- [x] T003 [P] Install devDependencies: `npm install -D @types/bcryptjs vitest @vitejs/plugin-react @playwright/test tsx`. **DONE 2026-05-14**: vitest 4.1.6, @vitejs/plugin-react 6.0.2, @playwright/test 1.60.0, tsx 4.22.0, @types/bcryptjs 2.4.6.
- [x] T004 [P] Tighten `tsconfig.json` to `"strict": true`, `"noUncheckedIndexedAccess": true`; verify `npm run build` still succeeds. **DONE 2026-05-14**: `"strict": true` was already on; added `"noUncheckedIndexedAccess": true`. Build still passes (5 static pages, no errors).
- [x] T005 Configure Tailwind v4 theme tokens in `app/globals.css`: surface `#0A0A0A`, card `#141414`, accent `#6366F1`, border-radius cap 12px, WCAG AA contrast — per Constitution Principle VII. **DONE 2026-05-14**: Rewrote `app/globals.css` with brand tokens (`--innova-surface`, `--innova-card`, `--innova-accent`, status colors per FR-021) and mapped them to the shadcn/ui-expected variable names (`--background`, `--card`, `--primary`, etc.). `--radius: 0.75rem` (= 12px cap). Body font set to `var(--font-sans)` (real font wiring in T008). Heavy file/section comments per Principle III. Build still passes.
- [ ] T006 Run `npx shadcn@latest init` with `new-york` style and dark mode default; verify `components/ui/` is created.
- [ ] T007 Install shadcn primitives in one batch: `npx shadcn@latest add button card input label textarea select dialog dropdown-menu table badge sonner skeleton form sidebar data-table`; verify all 14 files land under `components/ui/`.
- [ ] T008 [P] Configure fonts in `app/layout.tsx`: Geist Sans (body), Geist Mono (numbers), Bricolage Grotesque (display) — via `next/font/google`. Forbid Inter/Roboto/Arial/Space Grotesk anywhere.
- [ ] T009 [P] Create `.env` and `.env.example` at repo root with `DATABASE_URL="file:./prisma/dev.db"` and `AUTH_SECRET="innova-demo-secret-do-not-use-in-prod"`.
- [ ] T010 Update `.gitignore` to exclude `/uploads`, `/prisma/dev.db`, `/prisma/dev.db-journal`, `.env`, `.env.local`, `playwright-report`, `test-results`.
- [ ] T011 Add scripts to `package.json`: `dev`, `build`, `start`, `lint`, `typecheck` (= `tsc --noEmit`), `seed` (= `tsx prisma/seed.ts`), `db:reset` (= `prisma migrate reset --force && tsx prisma/seed.ts`), `test` (= `vitest run`), `test:e2e` (= `playwright test`). Also add `"prisma": { "seed": "tsx prisma/seed.ts" }`.
- [ ] T012 [P] Create `vitest.config.ts` at repo root with defaults (node env, `tests/**/*.test.ts`, no jsdom).
- [ ] T013 [P] Create `playwright.config.ts` at repo root with defaults: chromium only, `webServer` runs `npm run dev`, `baseURL: http://localhost:3000`.

**Checkpoint**: `npm run dev` boots a blank Next.js page on `http://localhost:3000` with dark theme tokens applied. Commit each task as `chore:`.

---

## Phase 2: Foundational (Blocking Prerequisites for ALL User Stories)

**Purpose**: Database, auth, layouts, shared libraries. NO user-story code in this phase, but every user story depends on this phase completing.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [ ] T014 Write `prisma/schema.prisma` per `data-model.md`: `Role`, `Status`, `Category` enums and `User`, `Idea`, `Evaluation` models with all comments per Principle III. Run `npx prisma migrate dev --name init` to create the first migration.
- [ ] T015 [P] Create `lib/prisma.ts`: singleton Prisma client using the `globalForPrisma` pattern so dev-mode hot reload doesn't leak connections.
- [ ] T016 [P] Create `lib/logger.ts`: `logError(op, ctx, err)` and `logInfo(op, ctx)` helpers that emit `[INNOVA] <ISO-timestamp> <op> { ...ctx }` via `console.error`/`console.log`. No log library.
- [ ] T017 [P] Create `lib/transitions.ts`: export `ALLOWED_TRANSITIONS: Record<Status, Status[]>`, `isAllowedTransition(from, to)`, `getAllowedTargets(from)` — encodes the 6 edges from FR-016.
- [ ] T018 [P] Write `tests/unit/transitions.test.ts`: assert every allowed edge returns `true` and at least 5 disallowed pairs (e.g. `SUBMITTED → ACCEPTED`, `ACCEPTED → REJECTED`) return `false`. Run `npm run test` and paste output.
- [ ] T019 [P] Create `lib/file-validation.ts`: export `validateAttachment(file: File): Promise<{ ok: true; mime } | { ok: false; reason }>` — checks size ≤10 MB, extension in `{pdf,doc,docx}`, AND first-bytes magic number matches the extension.
- [ ] T020 [P] Write `tests/unit/file-validation.test.ts`: assert valid PDF passes, valid DOCX passes, a `.pdf.exe` (PDF extension, EXE bytes) is rejected, and an 11 MB buffer is rejected. Run `npm run test` and paste output.
- [ ] T021 Create `auth.ts` at repo root: Auth.js v5 config with Credentials provider, `authorize` looks up user by email + verifies `bcryptjs` hash, `session: { strategy: "jwt" }`, `callbacks.jwt` copies `id` + `role`, `callbacks.session` copies them onto `session.user`. Exports `{ handlers, auth, signIn, signOut }`.
- [ ] T022 [P] Create `types/next-auth.d.ts`: augment `Session.user` and `User` so `role: "SUBMITTER" | "EVALUATOR"` is typed everywhere.
- [ ] T023 Create `app/api/auth/[...nextauth]/route.ts`: re-export `GET` and `POST` from `auth.ts` handlers.
- [ ] T024 Create `middleware.ts` at repo root: matcher `/dashboard/:path*`, `/ideas/:path*`, `/api/attachments/:path*`; redirects HTML requests to `/login?from=<path>` when unauthenticated, returns bare `404` for attachment API requests (preserves FR-014a). Excludes `/api/auth/*`.
- [ ] T025 [P] Create `lib/auth-helpers.ts`: `requireUser()` (throws/redirects if no session), `requireRole(role)` (throws if role mismatch), `getSessionUser()` (nullable). Used by every Server Action.
- [ ] T026 [P] Write `tests/unit/auth-helpers.test.ts`: assert `requireRole` returns user when role matches, throws when role missing, throws when no session. Run `npm run test` and paste output.
- [ ] T027 [P] Create `lib/zod-schemas.ts`: shared schemas — `EmailSchema`, `PasswordSchema`, `CategoryEnum`, `StatusEnum`, `RoleEnum`. Per-action schemas (registerSchema, submitIdeaSchema, evaluateIdeaSchema) compose from these.
- [ ] T028 Create `app/layout.tsx`: root layout with font variables applied, `<Toaster />` from sonner mounted, dark-mode class on `<html>`.
- [ ] T029 [P] Create `app/(public)/layout.tsx`: no sidebar; thin top nav with logo + Sign In / Register links visible when no session.
- [ ] T030 [P] Create `components/app-sidebar.tsx`: shadcn `Sidebar` adapted; role-aware nav items — Dashboard, Submit Idea + My Ideas (Submitters) or All Ideas (Evaluators), Log Out button.
- [ ] T031 Create `app/(app)/layout.tsx`: authenticated layout that calls `requireUser()`, wraps children with `<AppSidebar />`.
- [ ] T032 Create `app/(app)/dashboard/page.tsx` **STUB**: minimal page that reads the session and renders "Welcome, {name}". Real stat cards land in Phase 10. Needed now so US-1's redirect target exists.
- [ ] T033 Create `prisma/seed.ts`: idempotent script (upserts on email and on deterministic idea title) that creates Admin / Alice / Bob users with bcryptjs-hashed passwords and three seeded ideas (Submitted / Under Review / Accepted) plus two Evaluation rows on the latter two. Run `npm run db:reset` and paste output.

**Checkpoint**: `npm run db:reset && npm run dev` boots; visiting `/dashboard` redirects to `/login`; `npm run test` shows 3 passing test files. Commit each task individually.

---

## Phase 3: User Story 1 — Registration (Priority: P1) 🎯 MVP

**Goal**: A new user can register with name, email, password, and role choice; on success they are signed in and land on `/dashboard`.

**Independent Test**: Open `/register` cold; submit a valid form; verify redirect to `/dashboard` with the welcome message rendering the new user's name; verify `prisma.user.findUnique({ where: { email } })` shows a bcryptjs-hashed password (not the plaintext).

### Implementation for User Story 1

- [ ] T034 [P] [US1] Create `server/actions/register.ts`: Server Action that parses FormData against `registerSchema`, hashes password with `bcryptjs.hash(..., 10)`, creates the User in Prisma, returns `ActionResult<{ userId }>`; on email-unique violation returns `{ ok: false, error, fieldErrors: { email } }`; on success calls `signIn("credentials", { redirect: false })` and `revalidatePath("/dashboard")`. Wrap in try/catch with `[INNOVA]` log.
- [ ] T035 [US1] Create `app/(public)/register/page.tsx`: shadcn `Form` with name, email, password, role (`<Select>` SUBMITTER / EVALUATOR); inline Zod validation via `react-hook-form` + `zodResolver`; submit calls the Server Action; on `ok:false` shows `sonner` error toast and inline `fieldErrors`; on `ok:true` redirects to `/dashboard`.

**Checkpoint**: Run `npm run dev`; register a brand-new user; confirm dashboard renders welcome and a fresh User row exists with a hashed password (verify via `npx prisma studio`). Commit as `feat:`.

---

## Phase 4: User Story 2 — Login / Logout (Priority: P1) 🎯 MVP

**Goal**: A registered user can sign in with email + password, persist the session across reloads, and sign out cleanly.

**Independent Test**: Sign in as `alice@innova.local` / `alice123`; verify redirect to `/dashboard`; reload the page; verify still signed in. Click Log Out; verify redirect to `/` and that visiting `/dashboard` now redirects to `/login`.

### Implementation for User Story 2

- [ ] T036 [P] [US2] Create `app/(public)/login/page.tsx`: shadcn `Form` with email + password; submit calls `signIn("credentials", { email, password, redirect: false })`; on failure renders the generic "Invalid email or password." toast (no field-level leak per FR-006); on success `router.push(searchParams.from ?? "/dashboard")`.
- [ ] T037 [P] [US2] Wire Log Out in `components/app-sidebar.tsx`: button at bottom of sidebar calls `signOut({ redirectTo: "/" })`.
- [ ] T038 [US2] Create/update `app/(public)/page.tsx`: landing page with Bricolage Grotesque display headline, two CTAs (Sign In / Register), three shadcn `Card`s describing the value props — per FR-025. No sidebar.

**Checkpoint**: Run `npm run dev`; full sign-in/sign-out cycle works; landing page renders. Commit as `feat:` per task.

---

## Phase 5: User Story 3 — Submit an Idea (Priority: P1) 🎯 MVP

**Goal**: A Submitter can create a new idea with title (5–120), description (≤5000), category (single select), and an optional PDF/DOC/DOCX attachment ≤10 MB. On success, status = `SUBMITTED` and user is redirected to the detail page.

**Independent Test**: Sign in as alice; click "Submit Idea"; fill in title + description + category + attach a small test PDF; submit; confirm redirect to `/ideas/<id>` with a success toast and the attachment download link visible; confirm the file lives under `./uploads/`.

### Implementation for User Story 3

- [ ] T039 [US3] Create `server/actions/submit-idea.ts`: Server Action validates session + role = SUBMITTER, parses FormData, runs `validateAttachment(file)` if present, writes file to `./uploads/${crypto.randomUUID()}-${sanitizedName}`, creates Idea inside `prisma.$transaction` with status `SUBMITTED` and `filePath`, calls `revalidatePath("/ideas/mine")` and `revalidatePath("/dashboard")`, returns `{ ok: true, data: { ideaId } }`. Wrap in try/catch with `[INNOVA]` logger.
- [ ] T040 [P] [US3] Create `components/idea-submission-form.tsx`: shadcn `Form` with title `<Input>`, description `<Textarea>`, category `<Select>`, attachment `<Input type="file" accept=".pdf,.doc,.docx">`; live word/char counters and inline preview on the right column (desktop) / below (mobile); submit calls the Server Action and routes to the new idea on success.
- [ ] T041 [US3] Create `app/(app)/ideas/new/page.tsx`: server component that `requireRole("SUBMITTER")` then renders `<IdeaSubmissionForm />`. Evaluator visiting this route gets a 404 or redirect to `/ideas`.
- [ ] T042 [US3] Create `app/api/attachments/[id]/route.ts`: GET handler that calls `auth()`, looks up the idea, returns bare `404` unless requester is the owning Submitter OR any Evaluator (FR-014a); on success streams the file via `fs.createReadStream` with `Content-Disposition: attachment; filename="<original>"` and the correct MIME type; logs every request (success or 404) via `[INNOVA]`.

**Checkpoint**: Submitter can submit ideas with and without attachments; uploads land in `./uploads/`; attachment download works for owner; trying to fetch another user's attachment URL while signed in as Bob returns 404. Commit per task.

---

## Phase 6: User Story 4 — View My Own Ideas (Priority: P1) 🎯 MVP

**Goal**: A Submitter sees a list of only their own ideas, sorted newest first, with title / category / status / date / link to detail.

**Independent Test**: As Alice, after submitting two ideas, open `/ideas/mine`; confirm both visible newest-first, with no other Submitter's ideas. Confirm empty-state CTA shows for a brand-new Submitter with zero ideas.

### Implementation for User Story 4

- [ ] T043 [P] [US4] Create `components/my-ideas-list.tsx`: shadcn `Table` with columns Title / Category / Status (badge stub) / Submitted; renders rows from a server-fetched list; empty state shows icon + "No ideas yet" + CTA `<Button>` linking to `/ideas/new`.
- [ ] T044 [US4] Create `app/(app)/ideas/mine/page.tsx`: server component that `requireRole("SUBMITTER")`, queries `prisma.idea.findMany({ where: { submitterId }, orderBy: { createdAt: "desc" } })`, passes to `<MyIdeasList />`.

**Checkpoint**: Alice sees only her own ideas; Bob sees only his own; brand-new Submitter sees empty-state CTA. Commit per task.

---

## Phase 7: User Story 5 — View All Ideas (Evaluator) (Priority: P1) 🎯 MVP

**Goal**: An Evaluator sees every idea in the system, with submitter name visible, sortable by date and filterable by status.

**Independent Test**: As admin, open `/ideas`; confirm all 3 seeded ideas + any new ones submitted by Alice or Bob appear with submitter names. Sort by date; filter by status `UNDER_REVIEW`; confirm filter narrows to matching rows.

### Implementation for User Story 5

- [ ] T045 [P] [US5] Create `components/ideas-data-table.tsx`: shadcn `data-table` with columns Submitter / Title / Category / Status (badge stub) / Submitted; sortable by Submitted column; a status filter `<Select>` above the table that drives client-side row filtering.
- [ ] T046 [US5] Create `app/(app)/ideas/page.tsx`: server component that `requireRole("EVALUATOR")`, queries `prisma.idea.findMany({ include: { submitter: { select: { name: true } } }, orderBy: { createdAt: "desc" } })`, passes rows to `<IdeasDataTable />`.

**Checkpoint**: Evaluator sees all ideas; Submitter visiting `/ideas` is redirected away. Sort + filter work. Commit per task.

---

## Phase 8: User Story 7 — Status Tracking & Idea Detail Read-Side (Priority: P1) 🎯 MVP

**Note**: US-7 is implemented BEFORE US-6 because the detail page is a read-side surface that US-6 then writes onto. Building US-7 first means US-6 only adds the evaluation panel + Server Action, not the whole page.

**Goal**: Any signed-in user (the owning Submitter, or any Evaluator) opens an idea's detail page and sees the colored status badge plus the full chronological evaluation history. No write controls yet.

**Independent Test**: As admin, open the seeded `ACCEPTED` idea (Bob's kiosk idea); confirm the badge is green, the description renders, the attachment line (if any), and the timeline shows the seeded Evaluation event(s). As Alice, open her own `UNDER_REVIEW` idea; confirm blue badge + history. Try to open Bob's idea URL as Alice; confirm 404.

### Implementation for User Story 7

- [ ] T047 [P] [US7] Create `components/status-badge.tsx`: shadcn `Badge` variant mapping per FR-021 — `SUBMITTED → gray`, `UNDER_REVIEW → blue`, `ACCEPTED → green`, `REJECTED → red`. Accepts a `status` prop; renders human-readable label ("Under Review").
- [ ] T048 [P] [US7] Create `components/evaluation-timeline.tsx`: chronological list (oldest first) of Evaluation rows, each showing `priorStatus → newStatus`, evaluator name, ISO timestamp, comment (if any). Empty state: "No evaluations yet."
- [ ] T049 [US7] Create `app/(app)/ideas/[id]/page.tsx`: server component that calls `auth()`, fetches the idea + evaluations + submitter, enforces FR-014 (Submitter sees their own only, Evaluator sees all; everyone else gets `notFound()`), renders a `<Card>` with title, full description, category, `<StatusBadge />`, attachment download link (if `filePath`), and `<EvaluationTimeline />`. **No evaluation panel yet** — that lands in US-6.

**Checkpoint**: Detail page renders for both roles with badge + history; isolation works (Alice cannot see Bob's idea). Replace the `<Badge>` stub on the lists from Phases 6–7 with the real `<StatusBadge />`. Commit per task.

---

## Phase 9: User Story 6 — Evaluate an Idea (Priority: P1) 🎯 MVP

**Goal**: An Evaluator changes an idea's status along the allowed transition graph (FR-016) and writes a comment (required when moving to `ACCEPTED`/`REJECTED`). The change is persisted and visible to the Submitter.

**Independent Test**: As admin, open an idea in `SUBMITTED`; the status `<Select>` offers only `UNDER_REVIEW` (the allowed target). Move it to `UNDER_REVIEW` with no comment; success. Now move it to `ACCEPTED` with no comment; rejected inline. Add a comment; success. Switch to Alice; reopen the same idea; confirm her view shows the new green badge and both new history rows.

### Implementation for User Story 6

- [ ] T050 [US6] Create `server/actions/evaluate-idea.ts`: Server Action that requires `EVALUATOR` role, parses FormData against `evaluateIdeaSchema`, loads the idea, asserts `isAllowedTransition(idea.status, newStatus)` (else `ok:false`), asserts comment is non-empty when `newStatus ∈ {ACCEPTED, REJECTED}` (else `fieldErrors.comment`), inside `prisma.$transaction` creates an Evaluation row + updates the idea's status, then `revalidatePath("/ideas/${ideaId}")`, `revalidatePath("/ideas")`, `revalidatePath("/dashboard")`. Wrap in try/catch with `[INNOVA]` logger.
- [ ] T051 [P] [US6] Create `components/evaluation-panel.tsx`: client component visible only when `session.user.role === "EVALUATOR"`; status `<Select>` populated via `getAllowedTargets(currentStatus)`; comment `<Textarea>`; `Submit` button calls the Server Action; toast feedback via sonner; disables Submit while in flight; shows `<Skeleton>` per Principle VIII while loading.
- [ ] T052 [US6] Wire `<EvaluationPanel />` into `app/(app)/ideas/[id]/page.tsx` from US-7 — render it conditionally for Evaluators only (Submitters still see only the read-side detail).

**Checkpoint**: Evaluator can walk an idea Submitted → Under Review → Accepted with comment; Submitter sees updated badge + new history rows; disallowed transitions are blocked by the dropdown AND rejected by the server if forced. Commit per task.

---

## Phase 10: Dashboard Stats (FR-026a)

**Note**: Dashboard FR-026a isn't tied to a single user story — it depends on data created by US-3 / US-6, so it lands here AFTER all user stories work. The stub page from T032 is replaced by the real implementation in these tasks.

**Independent Test**: As Alice, `/dashboard` shows 4 status stat cards counting her own ideas + a total card; when she has zero ideas the empty state CTA appears. As admin, `/dashboard` shows total + 4 status cards counting ALL ideas + a Recent Activity list of up to 5 most recent evaluation events with idea title, new status, evaluator name, ISO timestamp.

- [ ] T053 Replace `app/(app)/dashboard/page.tsx` with the real implementation: server component that calls `auth()`, branches on `session.user.role`. For Submitters, query `prisma.idea.groupBy({ by: ["status"], where: { submitterId }, _count: true })` and render 4 shadcn `Card` stat tiles + total tile + empty-state CTA when total is 0. For Evaluators, same `groupBy` without the where clause, plus `prisma.evaluation.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { idea: true, evaluator: true } })` rendered as a Recent Activity list with empty-state "No evaluations yet."

**Checkpoint**: Both roles see correct dashboards on a freshly seeded DB; an empty Submitter sees the CTA. Commit as `feat:`.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Single landing-page animation, end-to-end test, README, final verification.

- [ ] T054 [P] Create `components/stagger-on-load.tsx`: Framer Motion client component using `staggerChildren` — the ONE allowed animation per Constitution Principle II. Apply to the 3 feature `Card`s on `app/(public)/page.tsx`.
- [ ] T055 Write `e2e/critical-path.spec.ts` (Playwright): exact storyline from research.md — log in as alice → submit idea (no attachment) → assert badge "Submitted" → log out → log in as admin → open the same idea → move to `UNDER_REVIEW` → assert badge text + timeline length increased by 1. Run `npm run db:reset && npm run test:e2e` and paste output.
- [ ] T056 [P] Write `README.md` at repo root: copy/adapt content from `specs/001-idea-portal-mvp/quickstart.md` with the operator-facing setup, seeded accounts, demo storyline, troubleshooting.
- [ ] T057 Manual verification per Principle VI: run `npm run db:reset && npm run dev`; perform the full 5-minute demo storyline from quickstart.md (land → register → submit → switch user → walk lifecycle → confirm isolation). Paste terminal log and a screenshot summary. Fix anything that breaks.
- [ ] T058 Run the full gauntlet: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`. All must pass. Paste output. Commit as `chore:`.

**Checkpoint**: Demo runs end-to-end on a clean DB; one Playwright test green; three Vitest tests green; lint + typecheck + build clean. Project is demo-ready.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: no dependencies; can start immediately.
- **Phase 2 (Foundational)**: depends on Phase 1; **BLOCKS** all user stories.
- **Phase 3 (US-1 Registration)**: depends on Phase 2.
- **Phase 4 (US-2 Login/Logout)**: depends on Phase 2. US-1 and US-2 can be done in parallel after Phase 2 if staffed.
- **Phase 5 (US-3 Submit)**: depends on Phase 2 + Phase 4 (need to be logged in to submit).
- **Phase 6 (US-4 My Ideas)**: depends on Phase 5 (need ideas to list).
- **Phase 7 (US-5 All Ideas)**: depends on Phase 5 (same reason).
- **Phase 8 (US-7 Status Tracking / Detail Read)**: depends on Phase 5 (need an idea to view).
- **Phase 9 (US-6 Evaluate)**: depends on Phase 8 (writes onto the detail page that US-7 built).
- **Phase 10 (Dashboard)**: depends on Phases 5–9 (needs ideas + evaluation events to count).
- **Phase 11 (Polish)**: depends on every prior phase.

### User Story Dependencies (Reading Order)

- US-1 / US-2: parallel after Foundational
- US-3 → US-4 / US-5 / US-7 (parallel after US-3)
- US-7 → US-6 (US-6 writes onto US-7's detail page)
- All → Dashboard → Polish

### Within Each User Story Phase

- Server Action (the write) before the UI that calls it
- Shared components (badge, timeline) before pages that compose them
- Each task ends with `npm run dev` + manual exercise + commit per Principles VI and IX

### Parallel Opportunities

- Within **Phase 1**: T002, T003, T004 install/config tasks are independent (different files).
- Within **Phase 2**: T015, T016, T017, T019, T022, T025, T027, T029, T030 touch different files and can be parallelized; T018, T020, T026 (tests) depend on their respective lib files landing first but can then run in parallel.
- **Phase 3 + Phase 4** (US-1, US-2) can be done in parallel by two operators after Phase 2 — but with a single non-coder operator, do them sequentially.
- Within **Phase 5**: T040 (form component) is independent of T039 (Server Action) and T042 (download route) at the file level; integration happens in T041.
- Within **Phase 8**: T047 + T048 (badge + timeline components) are independent files and run in parallel.
- Within **Phase 11**: T054 (animation) and T056 (README) are independent.

---

## Parallel Example: Phase 2 Foundational (lib/ files)

```bash
# All three can run concurrently (different files, no inter-dependencies):
Task: "T015 Create lib/prisma.ts singleton"
Task: "T016 Create lib/logger.ts [INNOVA] helpers"
Task: "T017 Create lib/transitions.ts graph + helpers"

# Then their tests, also concurrently:
Task: "T018 Write tests/unit/transitions.test.ts"
Task: "T020 Write tests/unit/file-validation.test.ts"
Task: "T026 Write tests/unit/auth-helpers.test.ts"
```

---

## Implementation Strategy

### MVP Slice 1 — "I can sign up and submit"

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US-1 Register) → Phase 4 (US-2 Login/Logout) → Phase 5 (US-3 Submit).
2. **Stop and verify**: Alice can register, sign in, submit an idea, and see it in the detail page (stub-rendered for now).
3. Deliverable: half the demo storyline is live.

### MVP Slice 2 — "I can see and walk the lifecycle"

4. Phase 6 (US-4 My Ideas) + Phase 7 (US-5 All Ideas) + Phase 8 (US-7 Detail Read) + Phase 9 (US-6 Evaluate).
5. **Stop and verify**: Run the full demo storyline manually.
6. Deliverable: the entire user-facing feature set works.

### Polish Slice

7. Phase 10 (Dashboard) + Phase 11 (Polish: animation, e2e test, README, final verification).
8. **Stop and verify**: `npm run db:reset && npm run test && npm run test:e2e && npm run build` all green, plus a manual demo dry-run.
9. Deliverable: demo-ready, defensible to a non-technical jury.

### Single-Operator Strategy (this is the actual one)

- No parallelization across phases — execute strictly top to bottom.
- After every task: stop, run `npm run dev`, exercise the feature, paste output, commit with the right conventional-commit prefix.
- If at any point a decision is missing or ambiguous, **stop and ask** per Principle V.

---

## Task Count Summary

| Phase | Count | Story Label |
|---|---|---|
| 1. Setup | 13 (T001–T013) | none |
| 2. Foundational | 20 (T014–T033) | none |
| 3. US-1 Registration | 2 (T034–T035) | US1 |
| 4. US-2 Login/Logout | 3 (T036–T038) | US2 |
| 5. US-3 Submit Idea | 4 (T039–T042) | US3 |
| 6. US-4 My Ideas | 2 (T043–T044) | US4 |
| 7. US-5 All Ideas | 2 (T045–T046) | US5 |
| 8. US-7 Status Tracking + Detail | 3 (T047–T049) | US7 |
| 9. US-6 Evaluate | 3 (T050–T052) | US6 |
| 10. Dashboard (FR-026a) | 1 (T053) | none |
| 11. Polish | 5 (T054–T058) | none |
| **Total** | **58** | |

## Notes

- `[P]` markers reflect file-level independence; with a single non-coder operator they're informational, not directive.
- Every task description names exact files so it can be picked up cold.
- Tests are kept to the operator-approved scope: 3 Vitest + 1 Playwright. No others.
- Commit after EACH task per Principle IX. One task = one conventional-commit.
- Manual verification (`npm run dev` + exercise the flow + paste output) is the "done" gate per Principle VI — type-checks and tests alone don't qualify.
- If you hit ambiguity, stop and ask per Principle V. No silent decisions.
