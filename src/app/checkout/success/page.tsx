import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutSuccessClient } from "./success-client";

export const metadata: Metadata = {
  title: "Payment confirmed — Repurpose AI",
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessClient />
    </Suspense>
  );
}
