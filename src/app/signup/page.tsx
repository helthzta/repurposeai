import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupPageClient } from "./signup-client";

export const metadata: Metadata = {
  title: "Sign up — Adiy AI",
  description: "Create a Adiy AI account and start turning ads into cinematic AI commercials.",
  openGraph: {
    title: "Sign up — Adiy AI",
    description: "Create a Adiy AI account and start creating AI commercials.",
  },
};

export default async function SignupPage() {
  // Already signed in — don't show the sign-up screen again, the session persists.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return <SignupPageClient />;
}
