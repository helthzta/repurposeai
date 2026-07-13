import type { Metadata } from "next";
import { CreditsPageClient } from "./credits-client";

export const metadata: Metadata = {
  title: "Credits — Repurpose AI",
  description: "Manage your generation credits and upgrade your plan.",
};

export default function CreditsPage() {
  return <CreditsPageClient />;
}
