/*
 * app/(public)/register/page.tsx
 * ====================================================================
 * What this file is: the /register route — the form a brand-new
 *   visitor fills in to create their account. On submit, calls the
 *   `registerUser` Server Action; on success, redirects to the
 *   dashboard with a session cookie already set.
 *
 * Why it exists: spec US-1 + FR-001. Every demo storyline begins
 *   here (or at /login if the operator wants to use a seeded
 *   account).
 *
 * Client component because react-hook-form needs hooks. The
 * actual side effects (DB write, password hash, sign-in) happen
 * inside the Server Action it calls.
 *
 * Read by: Next.js (route mapping). Composes shadcn Form primitives
 *   + the registerSchema from lib/zod-schemas.
 * ====================================================================
 */

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { registerSchema, type RegisterInput } from "@/lib/zod-schemas";
import { registerUser } from "@/server/actions/register";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/*
 * RegisterPage
 * --------------------------------------------------------------------
 * Inputs: none directly. URL `?from=` param is read so the page
 *   can route the user back to where they were trying to go AFTER
 *   they successfully register (matches the login flow's behavior).
 * Outputs: the registration form.
 * Callers: Next.js.
 *
 * Submit handler is async because we await the Server Action and
 * then route on the result.
 */
export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  // useState for the loading flag on the submit button so the
  // operator can SEE the in-flight state during the demo.
  const [submitting, setSubmitting] = useState(false);

  // react-hook-form wired to our Zod schema via zodResolver.
  // The `defaultValues` are required by RHF for the controlled
  // pattern to work consistently.
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "SUBMITTER",
    },
  });

  /*
   * onSubmit
   * ------------------------------------------------------------
   * Inputs: the validated form values (Zod has already approved).
   * Outputs: either routes to /dashboard (success) or surfaces
   *   the error via toast + RHF setError (failure).
   * Callers: react-hook-form's handleSubmit.
   */
  async function onSubmit(values: RegisterInput) {
    setSubmitting(true);
    try {
      // Build FormData manually so the Server Action receives the
      // same shape it would from a native `<form action={...}>`.
      // We could also pass values as a plain object via a typed
      // action wrapper, but FormData keeps the contract simple.
      const fd = new FormData();
      fd.set("name", values.name);
      fd.set("email", values.email);
      fd.set("password", values.password);
      fd.set("role", values.role);

      const result = await registerUser(fd);

      if (result.ok) {
        toast.success("Account created. Welcome to Innova.");
        // Use router.push so the JWT cookie set by the Server Action
        // is already present on the next request.
        router.push(from);
        router.refresh();
      } else {
        // Surface field-level errors inline and the top-line error
        // as a toast.
        toast.error(result.error);
        if (result.fieldErrors) {
          for (const [key, msg] of Object.entries(result.fieldErrors)) {
            form.setError(key as keyof RegisterInput, { message: msg });
          }
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Create your Innova account
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Already have one?{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              Sign in instead
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your full name"
                        autoComplete="name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    {/* shadcn Select doesn't fit FormControl perfectly
                        because it's a Radix Trigger; we wire onChange
                        + value manually to react-hook-form. */}
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose your role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="SUBMITTER">
                          Submitter — propose ideas
                        </SelectItem>
                        <SelectItem value="EVALUATOR">
                          Evaluator — review ideas
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
