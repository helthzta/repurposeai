import type { Metadata } from "next";
import { SettingsPageClient } from "./settings-client";

export const metadata: Metadata = {
  title: "Settings — Repurpose AI",
  description: "Manage your account, billing, API keys and preferences.",
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
