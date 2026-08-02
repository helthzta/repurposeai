"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Clapperboard,
  CreditCard,
  FolderKanban,
  HelpCircle,
  History,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  User,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "History", url: "/history", icon: History },
  { title: "Credits", url: "/credits", icon: CreditCard },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Help", url: "/help", icon: HelpCircle },
] as const;

function useCurrentUser() {
  const [state, setState] = useState<{
    name: string;
    plan: string;
    credits: number | null;
    isAdmin: boolean;
  }>({
    name: "",
    plan: "starter",
    credits: null,
    isAdmin: false,
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (!data.profile) return;
        setState({
          name: data.profile.full_name || data.profile.username || "Account",
          plan: data.profile.plan,
          credits: data.profile.credits_balance,
          isAdmin: !!data.profile.is_admin,
        });
      })
      .catch(() => undefined);
  }, []);

  return state;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { name, plan, isAdmin } = useCurrentUser();
  const initials = name ? name.slice(0, 2).toUpperCase() : "•";
  const items = isAdmin
    ? [...navItems, { title: "Admin", url: "/admin", icon: ShieldCheck }]
    : navItems;

  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5" onClick={onNavigate}>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-primary shadow-card">
          <Clapperboard className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <span className="truncate text-[15px] font-bold tracking-tight">Repurpose AI</span>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => {
          const active = pathname === item.url || pathname.startsWith(`${item.url}/`);
          return (
            <Link
              key={item.url}
              href={item.url}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name || "Loading…"}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">{plan} plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { name, credits } = useCurrentUser();
  const initials = name ? name.slice(0, 2).toUpperCase() : "•";

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-sidebar shadow-lift animate-fade-up">
            <button
              className="absolute right-3 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* Top nav */}
        <header className="sticky top-0 z-20 glass">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="truncate text-[15px] font-bold tracking-tight">{title}</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold sm:flex">
                <Zap className="h-3.5 w-3.5 text-warning" />
                {credits ?? "…"} credits
              </div>
              <Button
                size="sm"
                className="btn-glow hidden rounded-xl font-semibold sm:inline-flex"
                asChild
              >
                <Link href="/credits">Upgrade</Link>
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="rounded-xl border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 text-sm text-muted-foreground">
                  You&apos;re all caught up — no notifications yet.
                </PopoverContent>
              </Popover>
              <div className="grid h-8.5 w-8.5 place-items-center rounded-full gradient-primary text-[11px] font-bold text-primary-foreground">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
