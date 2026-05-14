/*
 * auth.ts
 * ====================================================================
 * What this file is: the single Auth.js v5 configuration for Innova.
 *   It exports the four things every other file in the app needs:
 *     - handlers — the GET/POST handlers for /api/auth/[...nextauth]
 *     - auth     — server-side helper: `const session = await auth()`
 *     - signIn   — server-action-friendly sign-in helper
 *     - signOut  — server-action-friendly sign-out helper
 *
 * Why it exists: every authentication-aware surface (middleware,
 *   Server Actions, server components, route handlers) reads from
 *   this file. Centralizing the config here keeps the Credentials +
 *   JWT contract from drifting.
 *
 * IMPORTANT — Stack Lock-In (Constitution Principle II):
 *   - The session strategy is `"jwt"`. NEVER `"database"`. Auth.js
 *     v5 silently breaks database sessions when paired with the
 *     Credentials provider; we do not give it a chance to do so.
 *   - Password verification uses `bcryptjs` (pure JS), not native
 *     `bcrypt`. The hash format is compatible either way.
 *
 * Read by: app/api/auth/[...nextauth]/route.ts, middleware.ts,
 *   every Server Action that needs `await auth()`, lib/auth-helpers.ts.
 * ====================================================================
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { logError, logInfo } from "@/lib/logger";

export const { handlers, auth, signIn, signOut } = NextAuth({
  /*
   * Where the auth-required redirect lands. `auth()` and middleware
   * push unauthenticated users to /login (instead of Auth.js's
   * default /api/auth/signin). The route file lives at
   * app/(public)/login/page.tsx (T036).
   */
  pages: {
    signIn: "/login",
  },

  /*
   * SESSION STRATEGY — pinned to JWT for the reasons in the header.
   * A `maxAge` of 30 days is fine for the demo; we re-issue the
   * token on every successful sign-in.
   */
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days, in seconds
  },

  /*
   * Providers — only Credentials. No GitHub, no Google, no
   * passwordless. Email + password and that's it (FR-001 / FR-004).
   */
  providers: [
    Credentials({
      // `name` is shown in the auth provider list. Since we only have
      // one provider, it's not user-visible anywhere, but it must
      // be a non-empty string.
      name: "credentials",

      // `credentials` declares the shape of the input the provider
      // expects. With `Credentials`, we manually build our own
      // login form, so this is mostly documentation.
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      /*
       * authorize
       * --------------------------------------------------------
       * Inputs: { email, password } from the login form.
       * Outputs: a User object on success, `null` on failure.
       *   When `null` is returned Auth.js shows the configured
       *   sign-in error to the client.
       * Callers: Auth.js itself, invoked when the client POSTs
       *   to /api/auth/callback/credentials.
       *
       * Wrapped in try/catch with `[INNOVA]` logging per
       * Constitution Principle IV.
       */
      async authorize(credentials) {
        const operation = "auth.authorize";
        try {
          // Cast to expected shape. Auth.js types `credentials` as
          // `Partial<Record<string, unknown>>` so we narrow it here.
          const email =
            typeof credentials?.email === "string"
              ? credentials.email
              : "";
          const password =
            typeof credentials?.password === "string"
              ? credentials.password
              : "";

          if (!email || !password) {
            // Returning null produces a generic "invalid credentials"
            // error per FR-006 (never tell the user which field
            // was wrong — that would leak existence of accounts).
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            // Same generic-null behavior as above.
            return null;
          }

          const passwordMatches = await bcryptjs.compare(
            password,
            user.passwordHash,
          );

          if (!passwordMatches) {
            return null;
          }

          // Success — emit an info log so the operator can confirm
          // the login in their terminal during the demo. NEVER log
          // the password (only the userId).
          logInfo(operation, {
            userId: user.id,
            email: user.email,
            role: user.role,
          });

          // Returning the user (minus the passwordHash) puts it on
          // Auth.js's pipeline; the jwt callback below picks up id
          // and role for the token.
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (err) {
          logError(operation, { email: credentials?.email }, err);
          // Returning null instead of re-throwing prevents Auth.js
          // from emitting a stack trace in the HTTP response.
          return null;
        }
      },
    }),
  ],

  /*
   * Callbacks — the two hook points where we copy id + role onto
   * the JWT (callbacks.jwt) and from the JWT onto session.user
   * (callbacks.session). Without these, `session.user.role` would
   * always be undefined and our role-gated UI/routes would break
   * silently.
   */
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on the very first sign-in (when
      // authorize() above returns). On every subsequent request,
      // Auth.js calls jwt() with only the token. So we copy
      // id + role into the token on first sign-in; they stick
      // for the life of the token.
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: "SUBMITTER" | "EVALUATOR" }).role;
      }
      return token;
    },
    async session({ session, token }) {
      // Mirror id + role from the token onto session.user so
      // any server component / Server Action that reads `auth()`
      // can do `session.user.role === "EVALUATOR"`.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "SUBMITTER" | "EVALUATOR";
      }
      return session;
    },
  },
});
