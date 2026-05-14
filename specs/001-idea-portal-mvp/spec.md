# Feature Specification: Innova MVP — Idea Submission & Evaluation Portal

**Feature Branch**: `001-idea-portal-mvp`

**Created**: 2026-05-14

**Status**: Draft

**Input**: Build Innova, an idea submission and evaluation portal inspired by an
internal corporate innovation platform. The MVP must support two user roles
(Submitter, Evaluator) and a complete idea lifecycle (Submitted → Under
Review → Accepted/Rejected) with file attachments, evaluation comments, and
seeded demo data.

## Plain-English Summary

Innova is a private web app for one company. Employees ("Submitters") sign up,
log in, and propose ideas with a title, description, category, and an
optional document attachment. A privileged group of users ("Evaluators")
sees every idea and walks each one through a four-stage lifecycle —
**Submitted → Under Review → Accepted or Rejected** — leaving a comment at
each step. Submitters can watch the status and read the evaluators' feedback
on their own ideas. That is the entire MVP.

There is no voting, no email, no draft mode, no multi-stage review board, and
no internationalization. Everything runs locally for the demo, with three
seeded user accounts and three seeded ideas already populated.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Registration (Priority: P1)

A new employee opens Innova, picks a role (Submitter or Evaluator), enters
their name, email, and password, and is immediately signed in and dropped on
their dashboard.

**Why this priority**: Without registration there are no users. P1 because
everything else depends on it.

**Independent Test**: Open the site cold, click "Register", fill the form,
submit, and confirm you land on the appropriate dashboard and remain signed
in on the next page reload.

**Acceptance Scenarios**:

1. **Given** the registration form is open, **When** a user submits a valid
   name, email, password, and role, **Then** the system creates the account,
   stores the password hashed (never plaintext), starts a session, and
   redirects to that role's dashboard.
2. **Given** the registration form, **When** the user submits an email that
   already exists, **Then** the system blocks the submission and shows a
   clear, plain-language error ("This email is already registered. Try
   logging in instead.").
3. **Given** the registration form, **When** any required field is empty or
   the email is malformed, **Then** the system shows inline validation on
   the offending field without submitting.

---

### User Story 2 — Login / Logout (Priority: P1)

A registered user signs in with email and password, stays signed in across
page reloads, and can sign out cleanly.

**Why this priority**: Required for every other story below.

**Independent Test**: Use a seeded account (`alice@innova.local` /
`alice123`) to sign in, reload the page (session survives), then click
"Log Out" and confirm the landing page reappears with no session.

**Acceptance Scenarios**:

1. **Given** the login form, **When** the user submits correct credentials,
   **Then** a session is created and the user is redirected to their
   dashboard.
2. **Given** the login form, **When** the user submits a wrong password or
   unknown email, **Then** the system shows a single generic error
   ("Invalid email or password.") and does not reveal which field was wrong.
3. **Given** a signed-in user, **When** they click "Log Out", **Then** the
   session is cleared and they are redirected to the public landing page.
4. **Given** a signed-in user, **When** they reload the page, **Then** the
   session persists and they remain authenticated.

---

### User Story 3 — Submit an Idea (Submitter) (Priority: P1)

A Submitter fills in a form (title, description, category, optional file
attachment) and creates a new idea with status **Submitted**.

**Why this priority**: This is the core capability of the product. The demo
collapses without it.

**Independent Test**: As Alice (Submitter), open "Submit Idea", fill in the
form including a small PDF attachment, submit, and confirm you arrive on the
idea's detail page with status **Submitted** and a download link for the PDF.

**Acceptance Scenarios**:

1. **Given** the submission form, **When** the Submitter enters a title
   between 5 and 120 characters, a description up to 5000 characters, a
   category, and submits, **Then** a new idea is persisted with status
   **Submitted** and the user is redirected to its detail page with a
   success toast.
2. **Given** the submission form, **When** the Submitter attaches a PDF,
   DOC, or DOCX file under 10 MB, **Then** the file is saved server-side
   and a download link appears on the idea's detail page.
3. **Given** the submission form, **When** the title is shorter than 5
   characters, longer than 120 characters, or the description is empty,
   **Then** the form blocks submission and shows inline validation on the
   offending field.
4. **Given** the submission form, **When** the user uploads a file larger
   than 10 MB or an unsupported file type, **Then** the form blocks
   submission and shows a clear error.

---

### User Story 4 — View My Own Ideas (Submitter) (Priority: P1)

A Submitter sees a list of every idea **they** have submitted, with title,
category, current status, submission date, and a link to the detail page.

**Why this priority**: Submitters must be able to track what they've
submitted. P1.

**Independent Test**: As Alice, after submitting two ideas, open
"My Ideas" and confirm both appear, newest first, with the correct status
and category. Bob's ideas must NOT appear.

**Acceptance Scenarios**:

1. **Given** Alice has submitted ideas, **When** she opens "My Ideas",
   **Then** the list shows only her ideas, sorted by submission date
   descending.
2. **Given** the "My Ideas" list, **When** Alice clicks an idea, **Then**
   she lands on the idea's detail page showing title, full description,
   category, current status, attachment download (if any), and the full
   evaluation history.
3. **Given** Alice has submitted zero ideas, **When** she opens
   "My Ideas", **Then** the page shows an empty state with an icon, a
   short headline ("No ideas yet"), and a button to "Submit your first
   idea".

---

### User Story 5 — View All Ideas (Evaluator) (Priority: P1)

An Evaluator sees a list of **every** idea submitted by **any** user, with
submitter name, title, category, current status, and submission date.

**Why this priority**: Required for evaluation to happen at all.

**Independent Test**: As admin@innova.local, open "All Ideas" and confirm
the three seeded ideas (from Alice and Bob) all appear with submitter names
visible.

**Acceptance Scenarios**:

1. **Given** the Evaluator is signed in, **When** they open "All Ideas",
   **Then** the list shows every idea in the system, including the
   submitter's name on each row.
2. **Given** the "All Ideas" list, **When** the Evaluator sorts by
   submission date, **Then** the rows reorder accordingly.
3. **Given** the "All Ideas" list, **When** the Evaluator filters by status
   (e.g. "Under Review"), **Then** only ideas in that status are shown.
4. **Given** the "All Ideas" list, **When** the Evaluator clicks an idea,
   **Then** they land on the idea's detail page with the evaluation
   controls visible (status dropdown, comment box, save button).

---

### User Story 6 — Evaluate an Idea (Evaluator) (Priority: P1)

On an idea's detail page, an Evaluator changes its status to one of
{Submitted, Under Review, Accepted, Rejected} and adds an evaluation
comment.

**Why this priority**: This is the second half of the core loop. Without it
the lifecycle never advances.

**Independent Test**: As admin, open Alice's "Solar-powered office lights"
idea, change status from **Submitted** to **Under Review** with the comment
"Promising — investigating ROI", save, and confirm the change appears in
the history. Then as Alice, open the same idea and confirm she sees the new
status and the evaluator's comment.

**Acceptance Scenarios**:

1. **Given** an idea in any status, **When** the Evaluator changes the
   status to **Under Review** and saves with any (optional) comment,
   **Then** the change is persisted and appears in the evaluation history
   with the evaluator's name and timestamp.
2. **Given** an idea, **When** the Evaluator tries to change the status to
   **Accepted** or **Rejected** without writing a comment, **Then** the
   form blocks submission and shows an inline error explaining the comment
   is required for terminal statuses.
3. **Given** a status change has been saved, **When** the corresponding
   Submitter reopens the idea, **Then** they see the new status badge and
   the evaluator's comment in the history.

---

### User Story 7 — Status Tracking (Both Roles) (Priority: P1)

Any signed-in user on an idea's detail page sees the current status as a
colored badge and the full evaluation history (status changes + comments)
in chronological order.

**Why this priority**: This is what makes the lifecycle visible. P1 because
the demo's headline moment is showing a status badge flip color.

**Independent Test**: Open an idea that has gone Submitted → Under Review →
Accepted. Confirm the badge is green ("Accepted") and the history shows
three entries in order with the right colors, names, and timestamps.

**Acceptance Scenarios**:

1. **Given** any idea, **When** any signed-in user (Submitter who owns it,
   or any Evaluator) opens the detail page, **Then** they see a colored
   status badge:
   - **Submitted** → gray
   - **Under Review** → blue
   - **Accepted** → green
   - **Rejected** → red
2. **Given** any idea, **When** any signed-in viewer opens the detail page,
   **Then** the evaluation history appears in chronological order (oldest
   first), each entry showing the prior status, new status, evaluator name,
   timestamp, and comment (if provided).

---

### Edge Cases

- **A Submitter tries to view someone else's idea by guessing the URL.**
  The system returns a 404 or "Not authorized" page — never the idea
  contents.
- **An Evaluator opens an idea while it is being edited by another
  Evaluator (race condition).** Last write wins; both writes are recorded
  in the history with their respective timestamps so nothing is lost.
- **The optional file attachment upload fails midway** (e.g., browser
  closed). No partial idea record is created; the Submitter sees a clear
  error and can retry.
- **A user uploads a `.pdf.exe` or similarly disguised file.** The system
  inspects both the filename's extension and the actual file content; if
  either disagrees with the declared type, the upload is rejected.
- **The Submitter's "My Ideas" list is empty.** Empty state with icon,
  headline, and CTA — never a blank page.
- **An Evaluator changes a status to its current value** (e.g. Submitted →
  Submitted). The system allows it but the history entry is still recorded
  (with comment if provided), to keep the audit trail honest.

## Requirements *(mandatory)*

### Functional Requirements

**Accounts & Sessions**

- **FR-001**: The system MUST allow a new user to register with name, email,
  password, and role (Submitter or Evaluator).
- **FR-002**: The system MUST store passwords using a one-way hash; plaintext
  passwords MUST NEVER be persisted.
- **FR-003**: The system MUST reject registration when the email is already
  in use, with a clear error message.
- **FR-004**: The system MUST allow a registered user to log in with email
  and password and persist that session across page reloads.
- **FR-005**: The system MUST allow a logged-in user to log out, clearing
  the session.
- **FR-006**: The system MUST display a generic error ("Invalid email or
  password.") on failed login — never indicating which field was wrong.

**Idea Submission**

- **FR-007**: Submitters MUST be able to submit an idea with a title
  (required, 5–120 characters), a description (required, ≤5000 characters),
  and a category (single select from: Product, Process, Technology,
  Customer Experience, Other).
- **FR-008**: Submitters MUST be able to optionally attach a single file
  (PDF, DOC, or DOCX) up to 10 MB in size to an idea.
- **FR-009**: The system MUST validate file size and type by checking
  **both** the filename's extension **and** the file's actual content
  signature, and MUST reject any file that fails either check (so a
  `.pdf.exe` cannot slip through).
- **FR-010**: On successful submission the idea MUST be created with status
  **Submitted** and the Submitter MUST be redirected to the idea's detail
  page with a success toast.

**Listing & Viewing**

- **FR-011**: Submitters MUST see only their own ideas in the "My Ideas"
  list, sorted newest first, with title, category, status, and submission
  date.
- **FR-012**: Evaluators MUST see every idea in the "All Ideas" list,
  including the submitter's name on each row.
- **FR-013**: The "All Ideas" list MUST be sortable by submission date and
  filterable by status.
- **FR-014**: Submitters MUST NOT be able to view another Submitter's idea
  by any means — including typing a guessed URL into the address bar.
- **FR-015**: The idea detail page MUST display title, full description,
  category, current status badge (colored per FR-021), submitter name,
  submission date, attachment download link (if attached), and the full
  evaluation history.

**Evaluation**

- **FR-016**: Evaluators MUST be able to change an idea's status to one of
  {Submitted, Under Review, Accepted, Rejected} from the detail page.
- **FR-017**: Evaluators MUST be required to provide a non-empty comment
  when moving an idea to **Accepted** or **Rejected**.
- **FR-018**: Every status change MUST be recorded in an audit history with
  prior status, new status, evaluator name, timestamp, and comment.
- **FR-019**: Submitters MUST NOT see evaluation controls (status dropdown,
  comment box) on any idea — even their own. They see history only.
- **FR-020**: Only Evaluators may change status or add evaluation comments.

**Status & UI Conventions**

- **FR-021**: The system MUST render status badges with these colors:
  Submitted → gray, Under Review → blue, Accepted → green, Rejected → red.
- **FR-022**: The system MUST default to dark mode with a single accent
  color (per Constitution Principle VII).
- **FR-023**: All forms MUST display inline validation, a loading state on
  the submit button while in flight, and a toast on completion (success or
  error).
- **FR-024**: All tables MUST be sortable; empty lists MUST render an
  empty-state with an icon, headline, and a primary CTA — never a blank
  area.
- **FR-025**: The landing page MUST present a hero, three feature cards,
  and CTAs to "Sign In" and "Register".
- **FR-026**: The authenticated layout MUST include a left sidebar with:
  Dashboard, Submit Idea, My Ideas (Submitters) or All Ideas (Evaluators),
  Log Out.

**Seed Data**

- **FR-027**: The system MUST ship with a seed script that creates:
  - One Evaluator: `admin@innova.local` / `admin123` (role: EVALUATOR)
  - Two Submitters: `alice@innova.local` / `alice123` and
    `bob@innova.local` / `bob123` (role: SUBMITTER)
  - Three sample ideas spread across different statuses so the demo isn't
    empty (e.g. one Submitted, one Under Review, one Accepted).

### Key Entities

- **User**: A person who registers and logs in. Attributes: name, email
  (unique), password (stored only as a one-way hash), role (Submitter or
  Evaluator), created-at timestamp.
- **Idea**: A proposal submitted by a Submitter. Attributes: title,
  description, category, current status (Submitted / Under Review /
  Accepted / Rejected), an optional attachment, created-at timestamp,
  and a link to the submitting User.
- **Evaluation Event**: A single entry in an idea's audit history.
  Attributes: prior status, new status, the Evaluator who made the change,
  the comment they wrote, and a timestamp. Linked to the Idea it belongs to.
- **Attachment**: A single file linked to an idea. Attributes: original
  filename, file type, file size, stored location. At most one per idea
  in the MVP.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A non-technical jury member, given the landing page URL,
  can register a new Submitter account and submit their first idea within
  3 minutes without any guidance.
- **SC-002**: An Evaluator can take an idea through all four statuses
  (Submitted → Under Review → Accepted) in under 60 seconds during the
  demo.
- **SC-003**: 100% of submitted ideas, status changes, and evaluation
  comments are visible to the correct audience (own ideas to Submitters,
  all ideas to Evaluators) and invisible to the wrong audience
  (other Submitters' ideas), verified by manual test before the demo.
- **SC-004**: On a freshly seeded database, opening the app shows three
  ideas across three different statuses without any setup steps required
  by the demo operator.
- **SC-005**: 100% of failed operations (failed login, failed upload,
  failed submission) surface a user-readable toast or inline error within
  500 milliseconds.
- **SC-006**: The demo can be set up on a clean laptop from `git clone` to
  running app in under 10 minutes by following the README.

## Assumptions

- The audience for the demo is a non-technical jury inside the building;
  no public deployment is required.
- The seeded passwords (`admin123`, `alice123`, `bob123`) are acceptable
  because the app is local-only and the demo is one night long; in a real
  deployment they would be replaced.
- "Evaluator" is the same as "admin" — there is no separate super-admin
  role above Evaluators in the MVP. Anyone with the EVALUATOR role can
  evaluate any idea.
- File attachments are stored on the local filesystem next to the SQLite
  database; no S3, no CDN.
- Role choice at registration is honored as-is (no admin approval step);
  the demo operator is responsible for ensuring only intended users pick
  the Evaluator role. In production this would change.
- There is no rate limiting, captcha, or anti-abuse layer in the MVP —
  the app is single-tenant and runs on localhost.
- The seed data script may be safely re-run; it should be idempotent
  (upsert by email / by deterministic idea title) so the demo can be
  reset cleanly.

## Out of Scope (Explicit Non-Goals)

These are explicitly **not** part of the MVP and will not be built tonight:

- Voting, scoring, ranking, blind review, or multi-stage review boards.
- Drafts, autosave, or "save without submitting".
- Multimedia attachments beyond a single PDF/DOC/DOCX (no images, video,
  multi-file uploads).
- Email notifications, in-app notifications, or any push channel.
- Cloud deployment, Docker, CI/CD — local-only is fine.
- Internationalization or localization (English only).
- Forgot-password / password-reset flows (seeded accounts only).
- Profile editing, avatars, or any user-settings page beyond logout.
- Search across ideas (filter-by-status on the All Ideas list is enough).
- Pagination (the seeded dataset is tiny; one page suffices).
