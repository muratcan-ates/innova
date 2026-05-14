/*
 * app/(public)/login/page.tsx
 * ====================================================================
 * What this file is: the /login route — the form a returning user
 *   fills in to sign in. On success, redirects to the dashboard (or
 *   to the path they were trying to reach before middleware kicked
 *   them out, via the `?from=` query).
 *
 * Why it exists: spec US-2 + FR-004 + FR-006. The demo uses
 *   `admin@innova.local` / `admin123` here to start the evaluation
 *   walkthrough, and `alice@innova.local` / `alice123` to start
 *   the submission walkthrough.
 *
 * FR-006 rule (no field-level leak): on bad credentials we show a
 *   SINGLE generic error — "Invalid email or password." — never
 *   "no account with that email" or "wrong password". This stops
 *   the page from leaking which accounts exist.
 *
 * Read by: Next.js (route mapping). Composes shadcn Form primitives
 *   + the loginSchema from lib/zod-schemas.
 * ====================================================================
 */

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

import { loginSchema, type LoginInput } from "@/lib/zod-schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/*
 * Top-level LoginPage is the Suspense boundary. `useSearchParams`
 * in Next.js 15 requires being inside a Suspense subtree at build
 * time — without the wrapper the page would 500 at runtime.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

/*
 * LoginForm
 * --------------------------------------------------------------------
 * Inputs: none directly. URL `?from=` param decides where to route
 *   the user after a successful sign-in (defaults to /dashboard).
 * Outputs: the login form.
 * Callers: the LoginPage wrapper above (via Suspense).
 *
 * Why client-side `signIn` (from next-auth/react) instead of the
 * server-action `signIn` from `@/auth`? With the Credentials
 * provider, the server-action `signIn` re-throws a `NEXT_REDIRECT`
 * even when `redirect:false` is passed (a known v5 quirk), which
 * makes it awkward to capture the success/failure state in a Server
 * Action. The client `signIn` returns a plain object we can branch
 * on — perfect for `react-hook-form` + a toast.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  /*
   * onSubmit
   * ------------------------------------------------------------
   * Inputs: validated form values.
   * Outputs: routes to `from` on success; toasts a generic error
   *   on failure. NEVER tells the user whether the email exists
   *   or whether the password was wrong (FR-006).
   * Callers: react-hook-form's handleSubmit.
   */
  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      // Auth.js returns `{ error?: string, ok: boolean, status: number }`.
      // Both wrong-email and wrong-password produce a non-null `error`.
      if (!result || result.error) {
        toast.error("Invalid email or password.");
        return;
      }

      toast.success("Signed in.");
      router.push(from);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Sign in to Innova
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/register"
              className="text-primary underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
            .
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
