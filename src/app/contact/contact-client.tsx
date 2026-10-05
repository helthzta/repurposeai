"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Clapperboard } from "lucide-react";
import { ContactForm } from "@/components/contact/ContactForm";

/**
 * Standalone public shell, same pattern as LegalLayout (src/components/legal/LegalLayout.tsx) —
 * doesn't assume a logged-in user, since the Custom plan's CTA and the Help section both link
 * here and a signed-out visitor should be able to reach it too.
 */
export function ContactPageClient() {
  const searchParams = useSearchParams();
  const planInterest = searchParams.get("plan") ?? undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-40 glass">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-primary shadow-card">
              <Clapperboard className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="truncate text-[15px] font-bold tracking-tight">Adiy AI</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-28 pb-20 sm:px-6">
        {planInterest && (
          <Link
            href="/dashboard"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
        )}

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Contact us</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Questions about a plan, billing, or anything else — we usually reply within a few hours.
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
          <ContactForm planInterest={planInterest} />
        </div>
      </main>
    </div>
  );
}
