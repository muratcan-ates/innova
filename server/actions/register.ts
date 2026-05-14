/*
 * server/actions/register.ts
 * ====================================================================
 * What this file is: the Server Action that creates a new user
 *   account and signs them in. Invoked from the form on
 *   `app/(public)/register/page.tsx`.
 *
 * Why it exists: spec US-1 says a new visitor fills name + email +
 *   password + role choice, submits, and lands on /dashboard
 *   already signed in. This action is the single transport that
 *   makes that happen — DB insert + sign-in cookie + revalidate.
 *
 * Shape: follows the canonical 5-step Server Action skeleton from
 *   contracts/server-actions.md —
 *     (1) session check — N/A (registration is the only public
 *         write; we skip this step).
 *     (2) role check    — N/A (no role required to register).
 *     (3) Zod validate  — `registerSchema`.
 *     (4) DB write      — bcrypt-hash + `prisma.user.create`.
 *     (5) revalidate    — `/dashboard`, then sign in.
 *
 * Spec mapping: FR-001, FR-002, FR-003, FR-006, US-1.
 *
 * Read by: components/register-form.tsx (T035).
 * ====================================================================
 */

"use server";

import bcryptjs from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";
import { registerSchema } from "@/lib/zod-schemas";
import type { ActionResult } from "@/lib/action-result";
import { signIn } from "@/auth";

/*
 * registerUser
 * --------------------------------------------------------------------
 * Inputs:
 *   - formData: a Web FormData containing name, email, password,
 *     and role fields.
 * Outputs: ActionResult<{ userId }>. On success the user has been
 *   created AND signed in (the Set-Cookie header lands on the same
 *   response). On failure: a single user-facing `error` plus
 *   optional `fieldErrors`.
 * Callers: components/register-form.tsx (via react-hook-form's
 *   handleSubmit).
 *
 * The whole body is wrapped in try/catch with `[INNOVA]` logging
 * per Constitution Principle IV.
 */
export async function registerUser(
  formData: FormData,
): Promise<ActionResult<{ userId: string }>> {
  const operation = "registerUser";

  try {
    // (3) Zod validate. We pull strings out of FormData and let
    // Zod's `.safeParse` turn validation issues into a structured
    // result we can map to fieldErrors.
    const raw = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
    };
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      // Build a flat { fieldName: firstErrorMessage } map for the
      // form to show as inline errors. Zod's tree can have multiple
      // issues per field — we take the first for compactness.
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        fieldErrors,
      };
    }
    const { name, email, password, role } = parsed.data;

    // (4) Hash the password. 10 rounds is the bcryptjs default
    // and the standard production-grade cost. Tests run plenty
    // fast on Apple Silicon at this cost.
    const passwordHash = await bcryptjs.hash(password, 10);

    // Create the User row. We catch the unique-constraint violation
    // separately so the form can highlight the email field.
    let user;
    try {
      user = await prisma.user.create({
        data: { name, email, role, passwordHash },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        // P2002 = unique constraint failed. The only unique field
        // on User is `email`, so this is always the duplicate-email
        // case from FR-003.
        return {
          ok: false,
          error: "This email is already registered.",
          fieldErrors: {
            email:
              "An account with this email already exists. Try logging in instead.",
          },
        };
      }
      throw err; // surface anything else to the outer catch
    }

    logInfo(operation, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // (5a) Sign the new user in. With Credentials + redirect:false,
    // Auth.js sets the JWT cookie on the same response and returns
    // — no client-side redirect needed (the form handles routing).
    try {
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
    } catch (err) {
      // If sign-in fails right after a successful create, log it
      // but still return ok:true so the user can manually log in.
      logError(operation, { phase: "auto-signin", userId: user.id }, err);
    }

    // (5b) Invalidate the dashboard cache so the user's fresh data
    // appears when they arrive.
    revalidatePath("/dashboard");

    return { ok: true, data: { userId: user.id } };
  } catch (err) {
    // Outer catch — any unexpected error becomes a generic toast.
    // Sanitized context only (no password, no full FormData dump).
    logError(
      operation,
      {
        email: typeof formData.get("email") === "string"
          ? (formData.get("email") as string)
          : null,
      },
      err,
    );
    return {
      ok: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
