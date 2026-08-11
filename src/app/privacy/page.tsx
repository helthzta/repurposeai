import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { PRIVACY_POLICY_BODY, PRIVACY_POLICY_LAST_UPDATED } from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy — Repurpose AI",
  description: "How Repurpose AI collects, uses, stores, and protects your information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated={PRIVACY_POLICY_LAST_UPDATED}>
      <LegalDocument body={PRIVACY_POLICY_BODY} />
    </LegalLayout>
  );
}
