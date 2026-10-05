import Link from "next/link";
import { Clapperboard } from "lucide-react";
import type { ReactNode } from "react";

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/copyright", label: "Copyright Policy" },
];

/**
 * Standalone public shell for legal pages (Terms/Privacy/Copyright) — unlike AppShell, this
 * doesn't assume a logged-in user, since these need to be readable before signup/login too.
 */
export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
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

      <main className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">{children}</div>

        <nav className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
