/*
 * components/ui/form.tsx
 * ====================================================================
 * What this file is: the shadcn-style Form primitive. It wraps
 *   react-hook-form's <FormProvider> + <Controller> with helper
 *   subcomponents (FormItem, FormLabel, FormControl, FormDescription,
 *   FormMessage, FormField) that wire up labels, aria-* attributes,
 *   error messages, and ids automatically.
 *
 * Why it exists: every form in Innova (register, login, submit-idea,
 *   evaluate-idea) goes through shadcn Form per Constitution
 *   Principle VIII (UI Component Discipline). The `shadcn add form`
 *   command did not produce a file for the base-nova preset, so this
 *   file was written by hand following the canonical shadcn pattern
 *   (which is style-agnostic — it's just a react-hook-form wrapper).
 *
 * Read by: every page or component that imports { Form, FormField,
 *   FormItem, FormLabel, FormControl, FormMessage } from
 *   "@/components/ui/form".
 *
 * Dependencies (all already installed):
 *   - react-hook-form (T002)
 *   - @radix-ui/react-slot (transitive via other primitives)
 *   - @/components/ui/label (T007)
 *   - @/lib/utils -> cn() (T006)
 * ====================================================================
 */

"use client"

import * as React from "react"
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

/*
 * Form
 * --------------------------------------------------------------------
 * Inputs: same props as react-hook-form's <FormProvider>.
 * Outputs: a context-providing wrapper that lets nested FormField /
 *   FormItem / FormControl access the form state without prop
 *   drilling.
 * Callers: every page that renders a shadcn form.
 */
const Form = FormProvider

/*
 * FormFieldContext + FormField
 * --------------------------------------------------------------------
 * FormField is a thin wrapper around react-hook-form's <Controller>.
 * It also publishes the field's `name` via context so that
 * downstream FormControl / FormLabel / FormMessage can compute their
 * own ids and aria-* attributes without the caller wiring them up.
 *
 * Inputs: ControllerProps from react-hook-form (name, control,
 *   render, etc.).
 * Outputs: a <Controller /> that pipes form-state to its render prop.
 * Callers: every form's JSX where a specific field is being rendered.
 */
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

/*
 * useFormField
 * --------------------------------------------------------------------
 * Inputs: none (reads from FormFieldContext + FormItemContext +
 *   react-hook-form's context).
 * Outputs: { id, name, formItemId, formDescriptionId,
 *   formMessageId, ...fieldState } where fieldState includes
 *   `error`, `invalid`, `isDirty`, etc.
 * Callers: FormLabel, FormControl, FormDescription, FormMessage —
 *   any subcomponent that needs to know about the current field
 *   for aria wiring and styling.
 *
 * Throws when used outside a FormField (helps catch wiring errors
 * early instead of producing silently-broken aria attributes).
 */
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

/*
 * FormItem
 * --------------------------------------------------------------------
 * Inputs: standard div props.
 * Outputs: a <div data-slot="form-item"> with vertical spacing.
 *   Also publishes a unique id via FormItemContext so child
 *   FormLabel / FormControl / FormMessage can compute matching ids.
 * Callers: every field wrapper inside a form.
 */
type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
}

/*
 * FormLabel
 * --------------------------------------------------------------------
 * Inputs: same props as shadcn <Label>.
 * Outputs: a <Label htmlFor={formItemId}> that turns red when the
 *   field has an error.
 * Callers: every form field that has a visible label.
 */
function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

/*
 * FormControl
 * --------------------------------------------------------------------
 * Inputs: any single child element (typically <Input>, <Textarea>,
 *   <Select>, etc.).
 * Outputs: that child, with `id`, `aria-describedby`, and
 *   `aria-invalid` props injected so screen readers can announce
 *   errors. Uses Radix's <Slot> for transparent prop forwarding.
 * Callers: every form field — wraps the actual input element.
 */
function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField()

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
}

/*
 * FormDescription
 * --------------------------------------------------------------------
 * Inputs: standard <p> props.
 * Outputs: a muted-foreground paragraph linked to the input via
 *   aria-describedby. Use for hints like "5–120 chars" beneath
 *   the title field.
 * Callers: optional, inside a FormItem.
 */
function FormDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

/*
 * FormMessage
 * --------------------------------------------------------------------
 * Inputs: optional children (a fallback message).
 * Outputs: a destructive-colored paragraph showing the current
 *   field's validation error (from react-hook-form). Renders
 *   nothing when there is no error AND no children. Linked to the
 *   input via aria-describedby.
 * Callers: every form field — provides inline error display.
 */
function FormMessage({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message ?? "") : props.children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-destructive text-sm", className)}
      {...props}
    >
      {body}
    </p>
  )
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
