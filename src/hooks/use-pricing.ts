"use client";

import { useQuery } from "@tanstack/react-query";
import type { Pricing } from "@/lib/pricing";

async function fetchPricing(): Promise<Pricing> {
  const res = await fetch("/api/pricing");
  if (!res.ok) throw new Error("Could not load pricing");
  return res.json();
}

/** Plans + per-video credit costs, shared by the Settings step and the Credits page. */
export function usePricing() {
  return useQuery({ queryKey: ["pricing"], queryFn: fetchPricing, staleTime: 5 * 60_000 });
}
