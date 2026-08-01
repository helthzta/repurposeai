import Link from "next/link";
import { Clapperboard } from "lucide-react";
import type { ReactNode } from "react";

/** Shared chrome for the Sign In / Sign Up screens — background, logo, card frame. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden gradient-hero animate-gradient-pan px-4">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary-glow/10 blur-3xl animate-float" />

      <div className="animate-fade-up relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary shadow-card">
            <Clapperboard className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">Repurpose AI</span>
        </Link>

        <div className="rounded-3xl border bg-card p-8 shadow-card">
          <h1 className="text-center text-xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">{subtitle}</p>

          {children}

          <p className="mt-6 text-center text-xs text-muted-foreground">{footer}</p>
        </div>
      </div>
    </div>
  );
}
