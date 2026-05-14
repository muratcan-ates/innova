/*
 * app/layout.tsx
 * ====================================================================
 * What this file is: the Next.js App Router root layout. It is the
 *   outermost <html> + <body> wrapper that EVERY page in Innova
 *   renders inside, regardless of route group ((public) or (app)).
 *
 * Why it exists: three jobs only —
 *   1. Wire up the three constitutionally-mandated fonts via
 *      next/font/google so they self-host and avoid the FOIT/FOUT
 *      flicker (Principle VII).
 *   2. Force dark mode by adding `className="dark"` to <html> so
 *      shadcn primitives that scope styles to `.dark *` activate
 *      their dark variants (Principle VII — "dark mode default").
 *   3. Mount the sonner <Toaster /> once at the root so any page or
 *      Server Action can call `toast.success(...)` / `toast.error(...)`
 *      without each page mounting its own toaster (Principle VIII —
 *      "Notifications use sonner, never alert()").
 *
 * Read by: Next.js itself; auto-applied to every page in app/.
 *
 * Forbidden fonts (Principle VII): Inter, Roboto, Arial, Space
 *   Grotesque. None are imported here or anywhere else.
 * ====================================================================
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/*
 * Geist Sans — body text font.
 * Why this var name: globals.css T005 maps --font-sans to
 * var(--font-geist-sans), so this `.variable` MUST be that string.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

/*
 * Geist Mono — numeric + tabular font. Used for timestamps, counts,
 * status counts in the Dashboard. Same variable-naming contract.
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/*
 * Bricolage Grotesque — display headlines (landing hero, page titles).
 * globals.css maps --font-display to var(--font-bricolage), so this
 * `.variable` must be exactly that.
 */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Innova — Idea Submission & Evaluation Portal",
  description:
    "Submit ideas. Track their evaluation. A private, local-only " +
    "innovation portal for one company.",
};

/*
 * RootLayout
 * --------------------------------------------------------------------
 * Inputs: { children } — the route subtree Next.js is about to render.
 * Outputs: a fully-styled <html><body> wrapper that:
 *   - declares the language as English
 *   - applies all three font CSS variables on <html> so descendants
 *     read them via Tailwind's font-sans / font-mono / font-display
 *   - forces dark mode via the `.dark` class
 *   - mounts the global <Toaster />
 * Callers: Next.js (implicit — App Router uses this for every route).
 *
 * suppressHydrationWarning is on <html> because dark-mode classes can
 * differ between SSR markup and client first-paint when a theme
 * provider is layered in later; we set `dark` statically here so there
 * is no mismatch today, but the attribute is harmless and avoids a
 * future regression.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
