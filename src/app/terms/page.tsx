import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { TERMS_OF_SERVICE_BODY, TERMS_OF_SERVICE_LAST_UPDATED } from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: "Terms of Service — Repurpose AI",
  description: "The terms that govern your access to and use of Repurpose AI.",
};

export default function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated={TERMS_OF_SERVICE_LAST_UPDATED}>
      <LegalDocument body={TERMS_OF_SERVICE_BODY} />
    </LegalLayout>
  );
}
