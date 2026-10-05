import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { LoginPageClient } from "./login-client";

export const metadata: Metadata = {
  title: "Sign in — Adiy AI",
  description: "Sign in to Adiy AI and start turning ads into cinematic AI commercials.",
  openGraph: {
    title: "Sign in — Adiy AI",
    description: "Sign in to Adiy AI and start creating AI commercials.",
  },
};

export default async function LoginPage() {
  // Already signed in — don't show the sign-in screen again, the session persists.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/profile");

  return (
    <Suspense>
      <LoginPageClient />
    </Suspense>
  );
}
