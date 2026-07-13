import type { Metadata } from "next";
import { HelpPageClient } from "./help-client";

export const metadata: Metadata = {
  title: "Help — Repurpose AI",
  description: "Answers to common questions about Repurpose AI.",
};

export default function HelpPage() {
  return <HelpPageClient />;
}
