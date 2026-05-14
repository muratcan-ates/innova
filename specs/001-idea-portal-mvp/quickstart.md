# Innova — Quickstart

**Tagline**: An idea submission and evaluation portal. One night. Local-only.
Dark-mode demo-ready.

This file is the operator-facing setup guide. It will be copied to the
project root as `README.md` during implementation.

---

## TL;DR (One-Command Demo)

```bash
git clone <repo-url> innova
cd innova
npm install
npm run db:reset      # creates ./prisma/dev.db, runs migrations, seeds 3 users + 3 ideas
npm run dev           # http://localhost:3000
```

Then open <http://localhost:3000> and log in with one of the seeded
accounts below.

---

## Seeded Accounts

| Role | Email | Password |
|---|---|---|
| Evaluator (admin) | `admin@innova.local` | `admin123` |
| Submitter | `alice@innova.local` | `alice123` |
| Submitter | `bob@innova.local` | `bob123` |

**These credentials are demo-only.** They live in `prisma/seed.ts` in
plain text on purpose so a non-coder operator can show them to the jury
without copy-pasting from a vault. They are NOT a production setting.

## Seeded Ideas

| Submitter | Title | Status |
|---|---|---|
| Alice | Solar-powered office lights | SUBMITTED |
| Alice | Quarterly cross-team innovation hour | UNDER_REVIEW |
| Bob | Self-service kiosk for visitor sign-in | ACCEPTED |

The UNDER_REVIEW and ACCEPTED ideas each have one Admin-written
Evaluation in their history, so the timeline is non-empty in the demo.

---

## Demo Storyline (5 minutes)

1. **Land cold** — open <http://localhost:3000>. Show the dark-mode hero,
   the three feature cards, and the Sign In / Register CTAs.
2. **Register a new Submitter live** — show a name + email + password + role
   form, submit, land on the Dashboard with all-zero stat cards and a
   "Submit your first idea" CTA.
3. **Submit an idea** — title, description, category, optional PDF. After
   submit, land on the idea's detail page with status = SUBMITTED (gray
   badge) and a toast.
4. **Switch users to admin** — log out, log in as `admin@innova.local`.
   Land on the Evaluator Dashboard (total counts + Recent Activity).
5. **Walk the lifecycle** — open the new idea, move it `SUBMITTED →
   UNDER_REVIEW` (badge turns blue), then `UNDER_REVIEW → ACCEPTED` with a
   one-line comment (badge turns green). Show the timeline grows by two
   entries with timestamps and the admin's name.
6. **Demonstrate isolation** — log out, log in as Bob, navigate to
   `/ideas/<alice-idea-id>` directly. Show the 404. Same for the
   attachment URL.

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
| `npm run test:e2e` | Playwright — runs the 1 critical-path spec under `e2e/` (starts a dev server, seeds, runs Chromium). |

---

## Project Layout (Top Level)

```text
innova/
├── app/                 # Next.js App Router pages + API routes
├── components/          # UI components (incl. shadcn primitives in components/ui/)
├── lib/                 # Prisma client, auth helpers, validation, logger
├── server/actions/      # Server Actions (the only mutation surface)
├── prisma/              # schema.prisma, migrations, seed.ts, dev.db (gitignored)
├── uploads/             # Attachment files (gitignored, outside public/)
├── tests/unit/          # 3 Vitest tests (pure logic only)
├── e2e/                 # 1 Playwright spec (critical path)
├── auth.ts              # Auth.js config
├── middleware.ts        # Route protection
└── README.md            # This file
```

---

## Environment Variables

A single `.env` file at the project root:

```dotenv
# .env (DO NOT commit if it ever contains real secrets)

# SQLite file location — relative to project root.
DATABASE_URL="file:./prisma/dev.db"

# Auth.js secret — used to sign JWTs.
# For the demo this is fine to be a fixed string.
AUTH_SECRET="innova-demo-secret-do-not-use-in-prod"
```

`.env.example` ships with the repo so the operator can copy it on first
clone:

```bash
cp .env.example .env
```

---

## Troubleshooting

### "Cannot find module 'bcryptjs'"

You installed `bcrypt` (the native one). Remove it and install
`bcryptjs` instead:

```bash
npm uninstall bcrypt
npm install bcryptjs
```

This is encoded as a constitutional pin (Principle II).

### Login silently fails / `auth()` returns `null`

Almost always means the Auth.js config has `session: { strategy: "database" }`
with the Credentials provider. That combination is unsupported — sessions
MUST be `"jwt"`. Check `auth.ts`.

### "Prisma client not generated"

Run:

```bash
npx prisma generate
```

`npm run db:reset` does this automatically.

### Port 3000 already in use

```bash
PORT=3001 npm run dev
```

### File upload rejected as "Invalid file"

The validator checks BOTH the extension AND the file's actual bytes
(per FR-009). A file renamed from `.exe` to `.pdf` will be rejected.
This is deliberate.

---

## What This MVP Is NOT

(See `specs/001-idea-portal-mvp/spec.md` "Out of Scope" for the full list.)

- No voting, scoring, or ranking.
- No drafts, no autosave.
- No email notifications.
- No cloud deployment, no Docker, no CI.
- No internationalization.
- No forgot-password flow — use the seeded accounts.
- No editing or deleting submitted ideas; no editing past evaluation
  comments. The audit trail is append-only.

---

## Architecture in One Paragraph

A single Next.js 15 process serves every page, API route, and Server
Action. Persistence is one SQLite file via Prisma. Auth is Auth.js v5
with the Credentials provider and JWT sessions (the only supported
pairing). All mutations are Server Actions (`server/actions/*`) with the
same shape: session check → role check → Zod validate → Prisma transaction
→ `revalidatePath` → typed result. File downloads go through a custom
`/api/attachments/[id]` route that returns 404 for any unauthorized
request. UI primitives are shadcn/ui (`new-york` style, dark mode); the
only animation is one Framer Motion stagger on the landing page.
