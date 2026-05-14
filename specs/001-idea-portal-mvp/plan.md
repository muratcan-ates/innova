# Implementation Plan: Innova MVP — Idea Submission & Evaluation Portal

**Branch**: `001-idea-portal-mvp` | **Date**: 2026-05-14 | **Spec**: [./spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-idea-portal-mvp/spec.md`

**Note**: This plan honors the locked stack in
[../../.specify/memory/constitution.md](../../.specify/memory/constitution.md)
(Principle II — Stack Lock-In). Every choice below is bound by that document.

## Summary

Innova is a single-tenant, local-first web app for submitting and evaluating
ideas. It is built and demoed in one night with a non-coder operator.
Architecture is deliberately the simplest shape that satisfies the spec:

- **One Next.js 15 (App Router) process** serves every page, API route, and
  Server Action.
- **One SQLite file** (`./prisma/dev.db`) stores all data.
- **One Auth.js v5 Credentials provider** with **JWT sessions** handles login,
  registration, role enforcement.
- **One private uploads folder** (outside `public/`) stores attachments;
  downloads go through an authenticated route that 404s for anyone who
  shouldn't see the file (per FR-014a).
- **All mutations are Server Actions** with the same shape: session check →
  role check → Zod validate → Prisma transaction → `revalidatePath` → typed
  result. No bespoke REST.
- **All UI primitives come from shadcn/ui** (`new-york` style, dark mode by
  default). No custom components are built when a shadcn primitive exists.

The deliverable is a working demo: `git clone && npm install && npm run db:reset
&& npm run dev`, then sign in as `admin@innova.local` / `admin123` and walk an
idea from Submitted to Accepted live.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 20+. React 19. Next.js 15
(App Router).

**Primary Dependencies**:

- Next.js 15, React 19, TypeScript
- Prisma (ORM) + `@prisma/client`
- `next-auth@beta` (Auth.js v5)
- `bcryptjs` (NOT `bcrypt` — pure JS, no native build)
- Tailwind CSS v4 + shadcn/ui (`new-york` style)
- `sonner` (toasts), `lucide-react` (icons)
- `react-hook-form` + `zod` (forms & validation)
- `framer-motion` (one page-load stagger animation only)
- **`vitest`** (devDependency, unit tests — 3 tests for pure logic only)
- **`@playwright/test`** (devDependency, end-to-end tests — 1 spec covering
  the critical path)

**Storage**: SQLite, single file at `./prisma/dev.db`. No external services.

**Testing**: Tightly scoped and operator-approved.

- **Vitest (3 unit tests, pure logic only)** — each test is a single file
  under `tests/unit/`:
  - `transitions.test.ts` — exercises `isAllowedTransition` for every
    allowed edge in FR-016 and a representative set of denied pairs.
  - `file-validation.test.ts` — exercises `validateAttachment` against
    a valid PDF, a valid DOCX, a `.pdf.exe` disguised binary, and a
    too-large buffer (≥10 MB).
  - `auth-helpers.test.ts` — exercises `requireRole` with a missing
    session, a wrong role, and a matching role.
- **Playwright (1 end-to-end spec)** — `e2e/critical-path.spec.ts`
  performs: log in as `alice@innova.local` → submit an idea (no
  attachment) → log out → log in as `admin@innova.local` → open the
  new idea → move it `SUBMITTED → UNDER_REVIEW` → assert the badge
  shows "Under Review" and the timeline grew by one row.
- **NOT** covered (deliberate scope cap, operator decision): component
  tests, snapshot tests, API contract tests, visual regression tests,
  accessibility tests.
- Type-checks (`tsc --noEmit`) and lint (`next lint`) still run on every
  build. Manual verification per Principle VI remains the primary "done"
  gate for every task.

**Target Platform**: macOS / Linux laptop running locally (`localhost:3000`).
No deployment target.

**Project Type**: Web application (single Next.js project; no separate
backend/frontend split).

**Performance Goals**: Demo scale — single user clicking through. Page
interactions render under 200 ms on a warm cache, file uploads complete in
under 2 s for a 10 MB PDF.

**Constraints**:

- Single process, single SQLite file, no Redis, no S3, no Docker.
- No log libraries — `console.log` / `console.error` only, all prefixed
  with `[INNOVA]` (Principle IV).
- Auth.js v5 + Credentials REQUIRES JWT sessions (database sessions silently
  break — locked by Principle II).
- File uploads MUST validate by extension AND content signature (FR-009).
- Attachments MUST be served only via an authenticated route that 404s on
  any unauthorized request (FR-014a).

**Scale/Scope**: Three seeded users, three seeded ideas, ~10 pages in the
UI. Designed for one operator and a small jury.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-evaluated after Phase 1 design.*

| Principle | Status | Evidence |
|---|---|---|
| I. Simplicity Over Cleverness | ✅ Pass | One process, one DB, no microservices. Server Actions chosen over a parallel REST API. |
| II. Stack Lock-In | ✅ Pass | Every runtime library is on the locked list. Two devDependencies — `vitest` and `@playwright/test` — were added with explicit operator approval (recorded in this plan) so the testing scope from Principle II's spirit is honored: nothing extra without a sign-off. |
| III. Explainability | ✅ Pass (forward-binding) | Plan commits to first-pass file/function/line comments in every file written during `/speckit-implement`. |
| IV. Observability | ✅ Pass (forward-binding) | Every Server Action, route handler, and external call will be wrapped in try/catch with `[INNOVA]`-prefixed `console.log`/`console.error` containing operation name, sanitized inputs, full error, ISO timestamp. |
| V. No Silent Assumptions | ✅ Pass | All five spec ambiguities were resolved via `/speckit-clarify`. Plan introduces no new assumptions; any that surface during implementation will trigger a stop. |
| VI. Verification-Before-Done | ✅ Pass (forward-binding) | `/speckit-tasks` will encode a "run dev, exercise flow, paste output" gate on each task. |
| VII. Aesthetic Discipline | ✅ Pass | Dark mode default; surface `#0A0A0A` / card `#141414` / accent `#6366F1`; Geist Sans + Mono + Bricolage Grotesque; ≤12 px radius. Configured in `tailwind.config.ts` and `app/globals.css`. |
| VIII. UI Component Discipline | ✅ Pass | All listed primitives installed via `npx shadcn@latest add`. No custom JSX before checking shadcn first. Skeletons for loading, sonner for toasts, shadcn Form for forms, shadcn data-table for the all-ideas table. |
| IX. Git Discipline | ✅ Pass (forward-binding) | `/speckit-tasks` will produce single-task commits with conventional-commit prefixes. |
| X. Demo-Readiness | ✅ Pass | This plan, the spec, and the task list will be readable by a non-technical reviewer; quickstart.md is the operator-facing one-command setup. |

**Result**: All gates pass. Complexity Tracking section is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-idea-portal-mvp/
├── spec.md              # Feature specification (clarified)
├── plan.md              # This file
├── research.md          # Phase 0 — library/stack justifications
├── data-model.md        # Phase 1 — Prisma schema + ER diagram
├── quickstart.md        # Phase 1 — operator-facing README content
├── contracts/
│   ├── server-actions.md  # Server Action signatures and contracts
│   └── http-routes.md     # /api/auth/[...nextauth] and /api/attachments/[id]
├── checklists/
│   └── requirements.md  # Spec quality checklist (✅ all passed)
└── tasks.md             # Phase 2 — produced by /speckit-tasks
```

### Source Code (repository root)

Innova ships as a single Next.js project. No `apps/` or `packages/` split.

```text
innova/
├── app/                              # Next.js App Router
│   ├── (public)/                     # Route group: no sidebar, public access
│   │   ├── page.tsx                  # Landing (/)
│   │   ├── login/page.tsx            # /login
│   │   ├── register/page.tsx         # /register
│   │   └── layout.tsx                # Public layout (no sidebar)
│   ├── (app)/                        # Route group: authenticated, sidebar
│   │   ├── dashboard/page.tsx        # /dashboard (stats per FR-026a)
│   │   ├── ideas/
│   │   │   ├── page.tsx              # /ideas (Evaluator-only all list)
│   │   │   ├── new/page.tsx          # /ideas/new (Submitter-only form)
│   │   │   ├── mine/page.tsx         # /ideas/mine (Submitter-only list)
│   │   │   └── [id]/page.tsx         # /ideas/[id] (detail + eval panel)
│   │   └── layout.tsx                # Authenticated layout (sidebar)
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # Auth.js handler
│   │   └── attachments/[id]/route.ts     # Auth-gated attachment download
│   ├── globals.css                   # Tailwind v4 + theme tokens
│   └── layout.tsx                    # Root layout (fonts, providers, Toaster)
├── components/
│   ├── ui/                           # shadcn/ui primitives (installed via CLI)
│   ├── app-sidebar.tsx               # Role-aware sidebar block
│   ├── status-badge.tsx              # Colored badge per FR-021
│   ├── evaluation-timeline.tsx       # Chronological history list
│   ├── evaluation-panel.tsx          # Evaluator-only status+comment form
│   ├── idea-submission-form.tsx      # Submission form (Submitters)
│   ├── ideas-data-table.tsx          # All-ideas data-table for Evaluators
│   ├── my-ideas-list.tsx             # Submitter's own ideas list
│   └── stagger-on-load.tsx           # The one Framer Motion animation
├── lib/
│   ├── prisma.ts                     # Prisma singleton (globalForPrisma)
│   ├── auth-helpers.ts               # requireUser(), requireRole()
│   ├── file-validation.ts            # extension + content-signature checks
│   ├── transitions.ts                # Allowed status transition graph
│   ├── logger.ts                     # [INNOVA] log helpers
│   └── zod-schemas.ts                # Shared Zod schemas
├── server/
│   └── actions/
│       ├── register.ts               # Server Action: register
│       ├── submit-idea.ts            # Server Action: submit idea + upload
│       └── evaluate-idea.ts          # Server Action: status change + comment
├── types/
│   └── next-auth.d.ts                # NextAuth type augmentation (role)
├── prisma/
│   ├── schema.prisma                 # Models (User, Idea, Evaluation) + enums
│   ├── seed.ts                       # Three seeded users + three ideas
│   ├── migrations/                   # Auto-generated by `prisma migrate dev`
│   └── dev.db                        # SQLite file (gitignored)
├── uploads/                          # Attachments — outside public/ (gitignored)
├── tests/
│   └── unit/
│       ├── transitions.test.ts       # Vitest: status transition validator
│       ├── file-validation.test.ts   # Vitest: extension + content-signature
│       └── auth-helpers.test.ts      # Vitest: requireRole behavior
├── e2e/
│   └── critical-path.spec.ts         # Playwright: submitter → evaluator round trip
├── auth.ts                           # exports { handlers, auth, signIn, signOut }
├── middleware.ts                     # Route protection
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts                  # Vitest config (defaults; node env, *.test.ts only)
├── playwright.config.ts              # Playwright config (defaults; chromium only)
├── package.json                      # scripts: dev, build, start, seed, db:reset, test, test:e2e
└── README.md                         # The quickstart (operator-facing)
```

**Structure Decision**: A single Next.js project with two App Router groups —
`(public)` and `(app)` — so the layout (sidebar / no-sidebar) is controlled
by route grouping instead of conditionals. Server Actions live under
`server/actions/` to keep mutation logic out of components. The Prisma client
is a single singleton in `lib/prisma.ts`. Uploads live in `./uploads/`
**outside** `public/` so the static-file server cannot accidentally serve
them; the authenticated `/api/attachments/[id]` route streams them.

## Phase 0 — Research

See [`research.md`](./research.md) for the per-library justifications and
the resolution of the five spec ambiguities.

## Phase 1 — Design

See:

- [`data-model.md`](./data-model.md) — Prisma schema + Mermaid ER and state
  diagrams.
- [`contracts/server-actions.md`](./contracts/server-actions.md) — typed
  signatures and error shapes for `register`, `submitIdea`, `evaluateIdea`.
- [`contracts/http-routes.md`](./contracts/http-routes.md) — the two HTTP
  routes (`/api/auth/[...nextauth]` and `/api/attachments/[id]`).
- [`quickstart.md`](./quickstart.md) — operator-facing one-command setup
  (this becomes the project `README.md`).

## Post-Design Constitution Re-Check

After writing the design artifacts, every gate still passes. Server Actions
remain the single mutation transport, no microservice split was created.
Two devDependencies (`vitest`, `@playwright/test`) were added with explicit
operator approval and a tightly capped test scope (3 unit + 1 e2e) — the
spirit of Principle II ("no library without asking") is honored. The
Complexity Tracking section remains empty.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

(none — every gate passed)
