/*
 * components/idea-submission-form.tsx
 * ====================================================================
 * What this file is: the form a Submitter fills in to create a new
 *   idea. Renders inside `app/(app)/ideas/new/page.tsx`.
 *
 * Why it exists: spec US-3 + FR-007 / FR-008 / FR-023. Two-column
 *   on desktop (form on the left, live preview on the right);
 *   single column on mobile.
 *
 * What this file is NOT: it is not a Server Action. It posts a
 *   FormData via `submitIdea` (server-side) and routes on the
 *   result. All write logic lives there.
 *
 * Read by: app/(app)/ideas/new/page.tsx.
 * ====================================================================
 */

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Paperclip, X } from "lucide-react";

import { submitIdeaSchema, type SubmitIdeaInput } from "@/lib/zod-schemas";
import { submitIdea } from "@/server/actions/submit-idea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/* Human-readable labels for the category enum. Kept here (not in
 * lib/) because they're purely a UI concern — the source of truth
 * is still the Zod / Prisma enum. */
const CATEGORY_LABELS: Record<SubmitIdeaInput["category"], string> = {
  PRODUCT: "Product",
  PROCESS: "Process",
  TECHNOLOGY: "Technology",
  CUSTOMER_EXPERIENCE: "Customer Experience",
  OTHER: "Other",
};

/*
 * IdeaSubmissionForm
 * --------------------------------------------------------------------
 * Inputs: none directly (controlled entirely by react-hook-form).
 * Outputs: a two-column form-and-preview layout. On successful
 *   submit, the page routes to /ideas/<id>.
 * Callers: app/(app)/ideas/new/page.tsx.
 */
export function IdeaSubmissionForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  // The chosen File lives in a ref because <input type="file"> is
  // uncontrolled; we read .files on submit and rely on the ref to
  // surface the chosen name in the preview/UI.
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);

  const form = useForm<SubmitIdeaInput>({
    resolver: zodResolver(submitIdeaSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "PRODUCT",
    },
  });

  // Watch title + description for the live preview pane.
  const watchedTitle = form.watch("title");
  const watchedDescription = form.watch("description");
  const watchedCategory = form.watch("category");

  function clearFile() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFileLabel(null);
  }

  /*
   * onSubmit
   * ------------------------------------------------------------
   * Inputs: validated form values from RHF.
   * Outputs: routes to /ideas/<id> on success, surfaces toast +
   *   inline field errors on failure.
   */
  async function onSubmit(values: SubmitIdeaInput) {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("title", values.title);
      fd.set("description", values.description);
      fd.set("category", values.category);

      // Attach the file if one was chosen. The Server Action treats
      // an absent/zero-size File as "no attachment".
      const file = fileInputRef.current?.files?.[0];
      if (file) fd.set("file", file);

      const result = await submitIdea(fd);

      if (result.ok) {
        toast.success("Idea submitted.");
        router.push(`/ideas/${result.data.ideaId}`);
        router.refresh();
      } else {
        toast.error(result.error);
        if (result.fieldErrors) {
          for (const [key, msg] of Object.entries(result.fieldErrors)) {
            // The file field is not a RHF field (it's the file input
            // ref); surface its error via toast and also via the
            // ad-hoc helper text below the file picker.
            if (key === "file") {
              setFileLabel(null);
              continue;
            }
            form.setError(key as keyof SubmitIdeaInput, { message: msg });
          }
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* ---------------- Left column: the form ----------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Submit an idea</CardTitle>
          <p className="text-sm text-muted-foreground">
            Title, description, category, and an optional file. Once
            submitted, ideas are read-only — you can&apos;t edit them
            later, so take a second to read it through.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="One sentence; 5–120 characters"
                        maxLength={120}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value.length}/120 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={8}
                        placeholder="What is the idea, who would it help, and what would it take to try?"
                        maxLength={5000}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value.length}/5000 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.keys(CATEGORY_LABELS) as Array<
                            keyof typeof CATEGORY_LABELS
                          >
                        ).map((k) => (
                          <SelectItem key={k} value={k}>
                            {CATEGORY_LABELS[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label
                  className="flex items-center gap-2 text-sm font-medium"
                  htmlFor="file"
                >
                  Attachment <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    id="file"
                    name="file"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground hover:file:bg-secondary/80"
                    onChange={(e) => {
                      const f = e.currentTarget.files?.[0];
                      setFileLabel(f ? f.name : null);
                    }}
                  />
                  {fileLabel && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={clearFile}
                      aria-label="Remove attachment"
                    >
                      <X />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, or DOCX. Max 10 MB.
                </p>
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Submitting…" : "Submit idea"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ---------------- Right column: live preview ------------ */}
      <div className="space-y-4 md:sticky md:top-8 self-start">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Preview
        </p>
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="text-xs font-mono uppercase text-muted-foreground">
              {CATEGORY_LABELS[watchedCategory]} · Submitted
            </p>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {watchedTitle || "Untitled idea"}
            </h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {watchedDescription ||
                "The description appears here as you type."}
            </p>
            {fileLabel && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground border-t border-border pt-3">
                <Paperclip className="h-4 w-4" />
                <span className="truncate">{fileLabel}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
