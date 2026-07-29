import { ApiError, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Confirms the session user's own profile has is_admin set, then hands back the
 * service-role client for the cross-user queries the admin dashboard needs.
 * The is_admin check itself goes through the RLS-scoped client (server.ts) —
 * a user can only ever read their own row, so this can't be spoofed by id.
 */
export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  if (!profile?.is_admin) throw new ApiError(403, "Admin access required");

  return { admin: createAdminClient(), user };
}
