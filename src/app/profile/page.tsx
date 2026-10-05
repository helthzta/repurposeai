import type { Metadata } from "next";
import { ProfilePageClient } from "./profile-client";

export const metadata: Metadata = {
  title: "Profile — Adiy AI",
  description: "Manage your personal info and brand profiles.",
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
