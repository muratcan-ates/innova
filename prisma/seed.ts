/*
 * prisma/seed.ts
 * ====================================================================
 * What this file is: the database seeder. Creates the three demo
 *   accounts and three demo ideas the spec requires (FR-027), so
 *   that on a fresh clone `npm run db:reset && npm run dev` boots
 *   into a non-empty app.
 *
 * Why it exists: the demo can't have an empty database. A
 *   non-coder operator opens the app for the jury and expects to
 *   see a populated all-ideas list, a populated history timeline,
 *   and at least one badge of each color.
 *
 *   Idempotency: the script upserts by email (Users) and by a
 *   deterministic title (Ideas). Running it twice produces the
 *   same DB shape — safe to re-run during the demo.
 *
 * Run by: `npm run seed` (direct) or as the post-step of
 *   `npm run db:reset` (configured via the `prisma.seed` block
 *   in package.json).
 *
 * Read by: the Prisma CLI when it invokes the seed command.
 * ====================================================================
 */

import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

/* The three seeded users with the credentials called out in
 * spec FR-027 and printed in quickstart.md. Demo-only passwords. */
const USERS = [
  {
    name: "Admin",
    email: "admin@innova.local",
    password: "admin123",
    role: "EVALUATOR" as const,
  },
  {
    name: "Alice",
    email: "alice@innova.local",
    password: "alice123",
    role: "SUBMITTER" as const,
  },
  {
    name: "Bob",
    email: "bob@innova.local",
    password: "bob123",
    role: "SUBMITTER" as const,
  },
];

/* The three seeded ideas. Each title is deterministic so the
 * upsert can find the existing row on a second seed run. */
const IDEAS: Array<{
  title: string;
  description: string;
  category:
    | "PRODUCT"
    | "PROCESS"
    | "TECHNOLOGY"
    | "CUSTOMER_EXPERIENCE"
    | "OTHER";
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  submitterEmail: string;
}> = [
  {
    title: "Solar-powered office lights",
    description:
      "Replace the office's overhead fluorescents with solar-charged LEDs. " +
      "Reduces grid load during business hours and cuts the lighting line " +
      "of the electric bill in half. Pilot it in the lobby first.",
    category: "TECHNOLOGY",
    status: "SUBMITTED",
    submitterEmail: "alice@innova.local",
  },
  {
    title: "Quarterly cross-team innovation hour",
    description:
      "Reserve one hour each quarter where every team presents one " +
      "small-scope idea they've been kicking around. No slide template, " +
      "no formal proposal. Just a five-minute pitch each, popcorn after.",
    category: "PROCESS",
    status: "UNDER_REVIEW",
    submitterEmail: "alice@innova.local",
  },
  {
    title: "Self-service kiosk for visitor sign-in",
    description:
      "Replace the paper visitor log at reception with an iPad-based " +
      "kiosk. Visitors type their name, the host, and the reason for the " +
      "visit. Host gets a push notification. Logs are exportable.",
    category: "CUSTOMER_EXPERIENCE",
    status: "ACCEPTED",
    submitterEmail: "bob@innova.local",
  },
];

/*
 * main
 * --------------------------------------------------------------------
 * The actual seed routine. Two phases:
 *   1. Upsert users (hashing passwords with bcryptjs).
 *   2. Upsert ideas. For UNDER_REVIEW and ACCEPTED ideas, also
 *      backfill the evaluation history so the timeline isn't empty
 *      in the demo (US-7 acceptance scenario 2).
 *
 * Idempotency: every upsert is keyed on a unique field (email for
 * Users; title for Ideas — see note below). Re-running the seed
 * does not duplicate rows.
 *
 * NOTE: title isn't a unique key on Idea in the schema. We work
 * around that by `findFirst` + branch — upsert isn't available
 * without a true @unique. The combination of submitterEmail + title
 * is treated as the seed's logical key.
 */
async function main() {
  console.log("[INNOVA seed]", new Date().toISOString(), "begin");

  // --- 1. Users ------------------------------------------------------
  for (const u of USERS) {
    const passwordHash = await bcryptjs.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      // On re-seed we update name/role/passwordHash so password
      // changes in the seed file propagate; we never recreate the id.
      update: {
        name: u.name,
        role: u.role,
        passwordHash,
      },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
      },
    });
    console.log(
      "[INNOVA seed] user upserted:",
      u.email,
      "(role:",
      u.role + ")",
    );
  }

  // --- 2. Ideas + Evaluation history --------------------------------
  for (const i of IDEAS) {
    const submitter = await prisma.user.findUniqueOrThrow({
      where: { email: i.submitterEmail },
    });
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: "admin@innova.local" },
    });

    // Find existing idea by (submitterId, title). If it exists,
    // delete its evaluation history first so we can re-build it
    // deterministically below.
    const existing = await prisma.idea.findFirst({
      where: { submitterId: submitter.id, title: i.title },
    });

    let idea;
    if (existing) {
      await prisma.evaluation.deleteMany({ where: { ideaId: existing.id } });
      idea = await prisma.idea.update({
        where: { id: existing.id },
        data: {
          description: i.description,
          category: i.category,
          status: i.status,
        },
      });
    } else {
      idea = await prisma.idea.create({
        data: {
          title: i.title,
          description: i.description,
          category: i.category,
          status: i.status,
          submitterId: submitter.id,
        },
      });
    }
    console.log(
      "[INNOVA seed] idea upserted:",
      i.title,
      "→",
      i.status,
    );

    // Backfill evaluation rows so the timeline matches the status.
    // SUBMITTED → no rows.
    // UNDER_REVIEW → one row (Submitted → Under Review by Admin).
    // ACCEPTED → two rows (Submitted → Under Review, then → Accepted).
    if (i.status === "UNDER_REVIEW") {
      await prisma.evaluation.create({
        data: {
          ideaId: idea.id,
          evaluatorId: admin.id,
          priorStatus: "SUBMITTED",
          newStatus: "UNDER_REVIEW",
          comment:
            "Promising idea — taking it through review. Want to see ROI numbers.",
        },
      });
    } else if (i.status === "ACCEPTED") {
      await prisma.evaluation.create({
        data: {
          ideaId: idea.id,
          evaluatorId: admin.id,
          priorStatus: "SUBMITTED",
          newStatus: "UNDER_REVIEW",
          comment: "Looks well-scoped. Moving to review.",
        },
      });
      await prisma.evaluation.create({
        data: {
          ideaId: idea.id,
          evaluatorId: admin.id,
          priorStatus: "UNDER_REVIEW",
          newStatus: "ACCEPTED",
          comment:
            "Approved. Hardware budget is in next quarter's plan; ops to coordinate.",
        },
      });
    }
  }

  console.log("[INNOVA seed]", new Date().toISOString(), "complete");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("[INNOVA seed] FAILED:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
