import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AdminDashboardClient } from "./admin-client";

export const metadata: Metadata = {
  title: "Admin — Repurpose AI",
  description: "Users, generations, and credit spend across the whole app.",
};

export default async function AdminPage() {
  let supabase, user;
  try {
    ({ supabase, user } = await requireUser());
  } catch {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/dashboard");

  return <AdminDashboardClient />;
}
