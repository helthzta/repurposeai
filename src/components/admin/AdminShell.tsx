"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Clapperboard,
  Coins,
  CreditCard,
  Film,
  Inbox,
  LayoutDashboard,
  LogOut,
  Repeat,
  Tags,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const NAV = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", url: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Customers",
    items: [
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "Subscriptions", url: "/admin/subscriptions", icon: Repeat },
      { title: "Payments", url: "/admin/payments", icon: CreditCard },
      { title: "Credit ledger", url: "/admin/credits", icon: Coins },
      { title: "Contact requests", url: "/admin/contacts", icon: Inbox },
    ],
  },
  {
    label: "Product",
    items: [
      { title: "Generations", url: "/admin/generations", icon: Film },
      { title: "Pricing", url: "/admin/pricing", icon: Tags },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Failures", url: "/admin/failures", icon: AlertTriangle },
      { title: "Activity log", url: "/admin/activity", icon: Activity },
    ],
  },
];

export function AdminShell({
  admin,
  children,
}: {
  admin: { name: string; email: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const title =
    NAV.flatMap((g) => g.items).find((i) =>
      i.url === "/admin" ? pathname === "/admin" : pathname.startsWith(i.url),
    )?.title ?? "Admin";

  const logout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <Link href="/admin" className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg gradient-primary">
              <Clapperboard className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold">Adiy AI</p>
              <p className="text-[11px] text-muted-foreground">Admin console</p>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {NAV.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const active =
                      item.url === "/admin" ? pathname === "/admin" : pathname.startsWith(item.url);
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={active}>
                          <Link href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
              {admin.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">{admin.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{admin.email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-semibold">{title}</h1>
        </header>
        <div className="flex-1 space-y-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
