# Innova

An idea submission and evaluation portal. Dark-mode default. Built and demoed in one night.

This README is the operator-facing setup guide. The deeper artifacts (spec, plan, contracts, tasks) live under `specs/001-idea-portal-mvp/` and are bound by `.specify/memory/constitution.md`.

---

## TL;DR (One-Command Demo)

```bash
git clone <repo-url> innova
cd innova
cp .env.example .env
npm install
npm run db:reset      # creates ./prisma/dev.db, runs migrations, seeds 3 users + 3 ideas
npm run dev           # http://localhost:3000
```

Open <http://localhost:3000> and log in with one of the seeded accounts below.

---

## Seeded Accounts

| Role | Email | Password |
|---|---|---|
| Evaluator (admin) | `admin@innova.local` | `admin123` |
| Submitter | `alice@innova.local` | `alice123` |
| Submitter | `bob@innova.local` | `bob123` |

**These credentials are demo-only.** They live in `prisma/seed.ts` in plain text on purpose so a non-coder operator can show them to the jury without copy-pasting from a vault. They are NOT a production setting.

## Seeded Ideas

| Submitter | Title | Status |
|---|---|---|
| Alice | Solar-powered office lights | Submitted |
| Alice | Quarterly cross-team innovation hour | Under Review |
| Bob | Self-service kiosk for visitor sign-in | Accepted |

The "Under Review" and "Accepted" ideas each have admin-written evaluation entries in their history, so the timeline is non-empty in the demo.

---

## Demo Storyline (5 minutes)

1. **Land cold** — open <http://localhost:3000>. Show the dark hero, the three feature cards (one Framer Motion stagger), and the Sign In / Register CTAs.
2. **Register a Submitter live** — name + email + password + role (default Submitter). After submit, land on the Dashboard with all-zero stat tiles and a "Submit your first idea" CTA.
3. **Submit an idea** — title + description + category, optional PDF/DOC/DOCX (≤10 MB). After submit, land on `/ideas/<id>` with a gray "Submitted" badge.
4. **Switch users to admin** — sign out, sign in as `admin@innova.local` / `admin123`. Evaluator dashboard shows total + per-status counts + Recent Activity.
5. **Walk the lifecycle** — open the new idea, move `Submitted → Under Review` (badge turns blue), then `Under Review → Accepted` with a one-line comment (badge turns green). Timeline grows by two rows with timestamps and the admin's name.
6. **Demonstrate isolation** — log out, sign in as Bob, paste Alice's idea URL into the address bar → 404. Same for the attachment URL.

---

## Available NPM Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts the Next.js dev server on <http://localhost:3000>. |
| `npm run build` | Production build. Type-checks and lints. |
| `npm run start` | Runs the production build (after `npm run build`). |
| `npm run seed` | Runs `prisma/seed.ts` against the existing DB. Idempotent. |
| `npm run db:reset` | **Wipes and recreates** the SQLite DB, runs migrations, then seeds. The "I want a fresh demo" button. |
| `npm run lint` | `next lint`. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run test` | Vitest — runs the 3 unit tests under `tests/unit/`. |
| `npm run test:e2e` | Playwright — runs the 1 critical-path spec under `e2e/` (Chromium only). |

---

## Project Layout

```text
innova/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Landing / login / register (no sidebar)
│   ├── (app)/                    # Dashboard / ideas/* (with sidebar)
│   └── api/                      # auth catch-all + attachment download
├── components/                   # UI components + shadcn primitives in components/ui/
├── lib/                          # Prisma client, auth helpers, validation, logger
├── server/actions/               # Server Actions (the only mutation surface)
├── prisma/                       # schema.prisma, migrations, seed.ts, dev.db (gitignored)
├── uploads/                      # Attachment files (gitignored, outside public/)
├── tests/unit/                   # 3 Vitest tests (pure logic only)
├── e2e/                          # 1 Playwright spec (critical path)
├── auth.ts                       # Auth.js v5 config
├── middleware.ts                 # Route protection
└── specs/001-idea-portal-mvp/    # Spec, plan, tasks, contracts, research
```

---

## Environment Variables

A single `.env` file at the project root:

```dotenv
DATABASE_URL="file:./dev.db"
AUTH_SECRET="innova-demo-secret-do-not-use-in-prod"
```

`.env.example` ships with the repo. On first clone:

```bash
cp .env.example .env
```

---

## Architecture in One Paragraph

A single Next.js 15 process serves every page, API route, and Server Action. Persistence is one SQLite file via Prisma 6. Auth is Auth.js v5 with the **Credentials** provider and **JWT** sessions (the only supported pairing — database sessions silently break with Credentials). All mutations are Server Actions (`server/actions/*.ts`) with the same shape: session → role → Zod → Prisma transaction → `revalidatePath` → typed `ActionResult`. File downloads go through `/api/attachments/[id]` which 404s for any unauthorized request. UI primitives are shadcn/ui (base-nova preset on Tailwind v4, dark mode default). The only animation is one Framer Motion stagger on the landing page's three cards.

---

## Stack Pins (per `.specify/memory/constitution.md`)

- Next.js 15 (App Router) + React 19 + TypeScript
- Prisma 6 + SQLite (one file at `./prisma/dev.db`)
- Auth.js v5 (`next-auth@beta`) with Credentials + JWT
- `bcryptjs` (pure JS, never the native `bcrypt`)
- Tailwind v4 + shadcn/ui (base-nova preset, dark mode default)
- `sonner` (toasts), `lucide-react` (icons), `react-hook-form` + `zod` (forms)
- Framer Motion — limited to one page-load stagger
- Geist Sans (body) + Geist Mono (numbers/timestamps) + Bricolage Grotesque (display)
- **Forbidden fonts**: Inter, Roboto, Arial, Space Grotesk

---

## Troubleshooting

### "Cannot find module 'bcryptjs'"

You installed `bcrypt` (the native one). Remove it and install `bcryptjs` instead — this is a stack pin (Principle II):

```bash
npm uninstall bcrypt
npm install bcryptjs
```

### Login silently fails / `auth()` returns `null`

Almost always means the Auth.js config has `session: { strategy: "database" }` with the Credentials provider. That combination is unsupported — sessions MUST be `"jwt"`. Check `auth.ts`.

### "Prisma client not generated"

```bash
npx prisma generate
```

`npm run db:reset` does this automatically.

### Port 3000 already in use

```bash
PORT=3001 npm run dev
```

### File upload rejected as "Invalid file"

The validator checks BOTH the extension AND the file's actual bytes (per FR-009). A file renamed from `.exe` to `.pdf` will be rejected. This is deliberate.

### `/dashboard` returns 404 (and not a login redirect)

Almost always means `/login` itself doesn't exist (T036 of the implementation plan). Middleware redirects to `/login`; if that route is missing, you see a 404 — not on `/dashboard` but on `/login`. Check `app/(public)/login/page.tsx` exists.

---

## What This MVP Is NOT

(See `specs/001-idea-portal-mvp/spec.md` "Out of Scope" for the full list.)

- No voting, scoring, or ranking.
- No drafts, no autosave.
- No email notifications.
- No cloud deployment, no Docker, no CI.
- No internationalization.
- No forgot-password flow — use the seeded accounts.
- No editing or deleting submitted ideas; no editing past evaluation comments. The audit trail is append-only.
