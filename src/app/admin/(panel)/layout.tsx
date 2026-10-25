import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin — Adiy AI",
  robots: { index: false, follow: false },
};

// Every admin page also calls requireAdminPage() itself — a layout doesn't re-run on every
// navigation, so it can't be the only gate.
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const { admin } = await requireAdminPage();
  return <AdminShell admin={{ name: admin.name, email: admin.email }}>{children}</AdminShell>;
}
