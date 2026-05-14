<!--
SYNC IMPACT REPORT
==================
Version change: (initial) → 1.0.0
Bump rationale: First ratification of the Innova constitution. No prior version
exists; therefore a MAJOR initial release (1.0.0).

Modified principles:
  (none — initial draft)

Added principles (all 10 are new):
  I.    Simplicity Over Cleverness
  II.   Stack Lock-In
  III.  Explainability
  IV.   Observability
  V.    No Silent Assumptions
  VI.   Verification-Before-Done
  VII.  Aesthetic Discipline
  VIII. UI Component Discipline
  IX.   Git Discipline
  X.    Demo-Readiness

Added sections:
  - Technology Stack (concrete pinned list backing Principle II)
  - Development Workflow & Quality Gates (process backing Principles V, VI, IX)
  - Governance

Removed sections:
  (none)

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — generic placeholders; Constitution
     Check section will reference this file at runtime. No edits required now.
  ✅ .specify/templates/spec-template.md — generic placeholders compatible
     with Principle V (No Silent Assumptions) and Principle X (Demo-Readiness).
  ✅ .specify/templates/tasks-template.md — generic placeholders compatible
     with Principle VI (Verification-Before-Done) and Principle IX (Git
     Discipline). The "Commit after each task" line in the Notes already aligns.
  ✅ .specify/extensions.yml — git hooks already wired for the speckit lifecycle
     (after_implement, after_tasks, etc.). No edits required.

Follow-up TODOs:
  (none — all placeholders were resolved from user input)
-->

# Innova Constitution

Innova is a one-night, production-quality idea submission and evaluation portal.
It is built by a single non-coder operator using Claude Code and GitHub Spec Kit.
This constitution exists so that every artifact, decision, and line of code can
be defended to a non-technical jury tomorrow morning.

## Core Principles

### I. Simplicity Over Cleverness

The smallest amount of code that correctly solves the problem wins. No premature
abstraction. No microservices. No speculative interfaces, factories, or plugin
systems. The runtime shape is fixed: **one Next.js app, one SQLite database,
one process.** If a feature can be expressed inline in a route handler or server
action, it MUST be expressed there rather than extracted into a helper
"for reuse later."

**Rationale**: Cleverness costs time we do not have and explainability we cannot
afford. Three similar lines beat a premature abstraction every time.

### II. Stack Lock-In (NON-NEGOTIABLE)

The technology stack is fixed. No library outside the list below may be added
without explicit operator approval. The pinned stack:

- Next.js 15 App Router with TypeScript
- Prisma ORM over a local SQLite file
- Auth.js v5 (`next-auth@beta`) with the **Credentials** provider
- Sessions: `session: { strategy: "jwt" }` — never database sessions with the
  Credentials provider
- Password hashing: `bcryptjs` (pure JS — no native build step)
- Tailwind CSS v4 + shadcn/ui (`new-york` style, dark mode default)
- `sonner` for toasts, `lucide-react` for icons
- `react-hook-form` + `zod` for forms and validation
- Framer Motion — restricted to **one** page-load stagger animation only

**Rationale**: A locked stack means zero time spent evaluating alternatives,
zero surprise build failures, and a demo that runs the same way it was built.
The Credentials + JWT pairing is intentional: database sessions with Credentials
are unsupported in Auth.js v5 and will silently break login.

### III. Explainability (NON-NEGOTIABLE)

Every artifact must be readable by a non-coder defending it to a jury.

- Every file MUST begin with a header comment stating **what** the file is and
  **why** it exists.
- Every function MUST have a comment describing its **inputs**, **outputs**,
  and **callers**.
- Every non-obvious line MUST carry an inline comment explaining the **WHY**
  (not the what — the name already says the what).
- These comments MUST be present in the **first version** of every file
  written. Comments are not a follow-up pass; code without them is incomplete.

**Rationale**: The author is non-technical and must explain every file to a
jury tomorrow. Comments are the demo script.

### IV. Observability (NON-NEGOTIABLE)

Every server action, route handler, and external call MUST be wrapped in
`try`/`catch`. Every `catch` block MUST log, at minimum:

1. The operation name (e.g. `submitIdea`)
2. The inputs that triggered the call (sanitized — never raw passwords)
3. The full error object
4. A timestamp (ISO 8601)

All log lines MUST be prefixed with `[INNOVA]` and use `console.log` /
`console.error`. No logging libraries.

**Rationale**: When something breaks during the demo, the terminal is the
debugger. A grep for `[INNOVA]` must surface every failure path instantly.

### V. No Silent Assumptions (NON-NEGOTIABLE)

If a requirement is ambiguous, the agent MUST stop and ask during the
`/speckit-clarify` phase rather than guessing. If during `/speckit-implement`
a missing decision is discovered, the agent MUST stop and ask — it MUST NOT
invent behavior, default to a "reasonable guess," or paper over the gap.

**Rationale**: A wrong guess at 11pm is a broken demo at 9am. Cheap clarifying
questions beat expensive rework.

### VI. Verification-Before-Done (NON-NEGOTIABLE)

A task is "done" only after **all** of the following have happened:

1. `npm run dev` (or the equivalent) has been started.
2. The relevant user flow has been exercised in the browser.
3. The actual terminal output and/or screenshot has been captured and shown
   to the operator.

Claims of "done" without a run are forbidden. Type-checks and tests verify
**code correctness**, not **feature correctness**.

**Rationale**: The deliverable is a working demo, not a green CI badge.

### VII. Aesthetic Discipline (NON-NEGOTIABLE)

The visual system is fixed:

- **Mode**: dark by default.
- **Colors**: surface `#0A0A0A`, card `#141414`, single accent
  electric indigo `#6366F1`. No second accent.
- **Typography**: Geist Sans for body, Geist Mono for numbers,
  Bricolage Grotesque for display headings.
- **Forbidden fonts**: Inter, Roboto, Arial, Space Grotesk.
- **Border radius**: 12px maximum.
- **Shadows**: subtle only — no neumorphism, no glow stacks.
- **Contrast**: WCAG AA minimum.
- **References (good)**: Linear, Vercel, Raycast.
- **Anti-references (forbidden)**: generic SaaS dashboards,
  purple-on-white gradients, three-card hero layouts.

**Rationale**: A consistent visual language is the difference between
"hackathon project" and "production product" to a non-technical jury.

### VIII. UI Component Discipline (NON-NEGOTIABLE)

Before writing **any** custom JSX, the agent MUST check whether a shadcn/ui
primitive or block exists for the use case. If one does:

- It MUST be installed via `npx shadcn@latest add <name>`.
- Forms MUST use shadcn `Form` components.
- Tables MUST use shadcn `data-table`.
- Loading states MUST use shadcn `Skeleton` — never spinners.
- Notifications MUST use `sonner` — never `alert()`.

**Rationale**: shadcn primitives are pre-styled, accessible, and consistent
with Principle VII. Reinventing them wastes the night.

### IX. Git Discipline

After each completed task, the agent MUST commit using a clear
conventional-commit message:

- `feat:` — new user-visible capability
- `fix:` — bug correction
- `chore:` — tooling, config, or housekeeping
- `docs:` — documentation only

One task = one commit. No batched "WIP" commits.

**Rationale**: A clean log is the rollback plan and the demo timeline.

### X. Demo-Readiness

The constitution, spec, plan, and tasks file MUST themselves be readable by a
non-technical reviewer:

- Plain English first; jargon only when defined.
- Concrete examples for any abstract requirement.
- No undefined acronyms.
- Bullet lists over walls of prose.

**Rationale**: These artifacts are part of the demo. They will be shown to the
jury as evidence of process discipline — they must read like a story, not a
spec sheet.

## Technology Stack

The following versions and packages are the canonical stack. Any deviation
requires explicit operator approval (see Principle II).

| Concern | Package / Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| ORM | Prisma |
| Database | SQLite (local file) |
| Auth | Auth.js v5 (`next-auth@beta`), Credentials provider |
| Session strategy | JWT (`session: { strategy: "jwt" }`) |
| Password hashing | `bcryptjs` |
| Styling | Tailwind CSS v4 |
| Component library | shadcn/ui (`new-york` style, dark mode) |
| Toasts | `sonner` |
| Icons | `lucide-react` |
| Forms | `react-hook-form` + `zod` |
| Animation | Framer Motion (one page-load stagger only) |

## Development Workflow & Quality Gates

The Spec Kit lifecycle is the workflow. Each phase has a gate:

1. **`/speckit-specify`** — feature described in plain English (Principle X).
2. **`/speckit-clarify`** — ambiguity hunt; agent asks rather than guesses
   (Principle V).
3. **`/speckit-plan`** — implementation plan checked against this constitution
   (especially Principles I, II, VII, VIII).
4. **`/speckit-tasks`** — tasks ordered, each scoped so it can be verified
   independently (Principle VI).
5. **`/speckit-implement`** — code written with comments **on the first pass**
   (Principle III), wrapped in try/catch with `[INNOVA]` logs (Principle IV),
   verified live (Principle VI), and committed with a conventional-commit
   message (Principle IX).

Git hooks defined in `.specify/extensions.yml` enforce auto-commit checkpoints
across the lifecycle. They MUST remain enabled.

## Governance

This constitution supersedes any conflicting practice, convention, or
suggestion — including suggestions from the agent itself.

**Amendment procedure**: amendments are made by re-running `/speckit-constitution`
with the proposed change. Each amendment MUST update:

1. The relevant principle or section.
2. The version line at the bottom of this file.
3. The `LAST_AMENDED_DATE`.
4. The Sync Impact Report comment at the top.

**Versioning policy** (semantic):

- **MAJOR** — a principle is removed or its meaning materially reversed.
- **MINOR** — a new principle or section is added, or guidance is materially
  expanded.
- **PATCH** — wording clarifications, typo fixes, or non-semantic refinements.

**Compliance review**: every `/speckit-plan` run MUST include a Constitution
Check against this file. Violations MUST be either fixed or documented in the
plan's Complexity Tracking table with an explicit justification.

**Runtime guidance file**: `CLAUDE.md` in the project root is the live
operator-facing companion to this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-05-14 | **Last Amended**: 2026-05-14
