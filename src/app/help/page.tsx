import type { Metadata } from "next";
import { HelpPageClient } from "./help-client";

export const metadata: Metadata = {
  title: "Help — Adiy AI",
  description: "Answers to common questions about Adiy AI.",
};

export default function HelpPage() {
  return <HelpPageClient />;
}
