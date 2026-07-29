import { NextResponse } from "next/server";
import { withLogger } from "@/lib/logger";
import { requireAdmin } from "@/lib/admin";

export const GET = withLogger("admin.users.list", async () => {
  const { admin } = await requireAdmin();

  const [
    { data: profiles, error: profilesError },
    { data: projects, error: projectsError },
    { data: generations, error: generationsError },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username, email, full_name, plan, credits_balance, is_admin, created_at")
      .order("created_at", { ascending: false }),
    admin.from("projects").select("id, user_id"),
    admin.from("generations").select("project_id, credits_charged, status"),
  ]);
  if (profilesError) throw profilesError;
  if (projectsError) throw projectsError;
  if (generationsError) throw generationsError;

  const projectToUser = new Map((projects ?? []).map((p) => [p.id, p.user_id]));
  const perUser = new Map<string, { generationCount: number; creditsSpent: number }>();

  for (const g of generations ?? []) {
    const userId = projectToUser.get(g.project_id);
    if (!userId) continue;
    const entry = perUser.get(userId) ?? { generationCount: 0, creditsSpent: 0 };
    entry.generationCount += 1;
    if (g.status === "completed") entry.creditsSpent += g.credits_charged ?? 0;
    perUser.set(userId, entry);
  }

  const projectCountByUser = new Map<string, number>();
  for (const p of projects ?? []) {
    projectCountByUser.set(p.user_id, (projectCountByUser.get(p.user_id) ?? 0) + 1);
  }

  const users = (profiles ?? []).map((profile) => ({
    ...profile,
    projectCount: projectCountByUser.get(profile.id) ?? 0,
    generationCount: perUser.get(profile.id)?.generationCount ?? 0,
    creditsSpent: perUser.get(profile.id)?.creditsSpent ?? 0,
  }));

  return NextResponse.json({ users });
});
