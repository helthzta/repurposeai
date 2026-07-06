import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Clapperboard,
  CreditCard,
  FolderKanban,
  HelpCircle,
  History,
  LayoutDashboard,
  Menu,
  Plug,
  Settings,
  X,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "History", url: "/history", icon: History },
  { title: "Credits", url: "/credits", icon: CreditCard },
  { title: "API", url: "/api", icon: Plug },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Help", url: "/help", icon: HelpCircle },
] as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5" onClick={onNavigate}>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-primary shadow-card">
          <Clapperboard className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <span className="truncate text-[15px] font-bold tracking-tight">Repurpose AI</span>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const active = pathname === item.url;
          return (
            <Link
              key={item.url}
              to={item.url}
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
            AK
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Alex Kim</p>
            <p className="truncate text-xs text-muted-foreground">Pro plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
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
                240 credits
              </div>
              <Button size="sm" className="btn-glow hidden rounded-xl font-semibold sm:inline-flex" asChild>
                <Link to="/credits">Upgrade</Link>
              </Button>
              <button className="relative rounded-xl border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              </button>
              <div className="grid h-8.5 w-8.5 place-items-center rounded-full gradient-primary text-[11px] font-bold text-primary-foreground">
                AK
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
