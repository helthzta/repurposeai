"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Profile } from "@/lib/types";

export const PROFILE_QUERY_KEY = ["profile"] as const;

async function fetchProfile(): Promise<{ profile: Profile | null; email: string }> {
  const res = await fetch("/api/profile");
  if (!res.ok) throw new Error("Could not load profile");
  return res.json();
}

/**
 * Shared profile cache — AppShell's sidebar and the Profile page both read this same
 * query, so a save/upload on the Profile page is reflected everywhere immediately
 * instead of only after the next full mount (e.g. navigating to another route).
 */
export function useProfile() {
  return useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: fetchProfile });
}

/** Call after a successful profile mutation to push the new row into the shared cache. */
export function useUpdateProfileCache() {
  const queryClient = useQueryClient();
  return (profile: Profile) =>
    queryClient.setQueryData(
      PROFILE_QUERY_KEY,
      (old: { profile: Profile | null; email: string } | undefined) =>
        old ? { ...old, profile } : old,
    );
}
