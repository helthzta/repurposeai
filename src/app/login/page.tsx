import type { Metadata } from "next";
import { LoginPageClient } from "./login-client";

export const metadata: Metadata = {
  title: "Log in — Repurpose AI",
  description: "Sign in to Repurpose AI and start turning ads into cinematic AI commercials.",
  openGraph: {
    title: "Log in — Repurpose AI",
    description: "Sign in to Repurpose AI and start creating AI commercials.",
  },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
