import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactPageClient } from "./contact-client";

export const metadata: Metadata = {
  title: "Contact Us — Repurpose AI",
  description: "Get in touch with the Repurpose AI team — plans, billing, or anything else.",
};

export default function ContactPage() {
  return (
    <Suspense>
      <ContactPageClient />
    </Suspense>
  );
}
