import type { Metadata } from "next";
import { ApiPageClient } from "./api-client";

export const metadata: Metadata = {
  title: "API — Repurpose AI",
  description: "Integrate Repurpose AI video generation into your own products.",
};

export default function ApiPage() {
  return <ApiPageClient />;
}
