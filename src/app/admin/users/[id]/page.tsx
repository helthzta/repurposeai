import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AdminUserDetailClient } from "./user-detail-client";

export const metadata: Metadata = {
  title: "User — Admin — Repurpose AI",
  description: "A single user's projects, generations, and credit activity.",
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

  return <AdminUserDetailClient userId={id} />;
}
