import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutSuccessClient } from "./success-client";

export const metadata: Metadata = {
  title: "Payment confirmed — Adiy AI",
};

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessClient />
    </Suspense>
  );
}
