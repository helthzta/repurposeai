import { NextResponse } from "next/server";
import { withLogger } from "@/lib/logger";
import { requireAdmin } from "@/lib/admin";

export const GET = withLogger("admin.overview", async () => {
  const { admin } = await requireAdmin();

  const [
    { count: userCount },
    { count: projectCount },
    { count: generationCount },
    { count: completedCount },
    { count: failedCount },
    { data: creditRows },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("projects").select("*", { count: "exact", head: true }),
    admin.from("generations").select("*", { count: "exact", head: true }),
    admin.from("generations").select("*", { count: "exact", head: true }).eq("status", "completed"),
    admin.from("generations").select("*", { count: "exact", head: true }).eq("status", "failed"),
    admin.from("generations").select("credits_charged").eq("status", "completed"),
  ]);

  const totalCreditsSpent = (creditRows ?? []).reduce(
    (sum, r) => sum + (r.credits_charged ?? 0),
    0,
  );

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { count: newUsersThisWeek } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since.toISOString());

  return NextResponse.json({
    userCount: userCount ?? 0,
    newUsersThisWeek: newUsersThisWeek ?? 0,
    projectCount: projectCount ?? 0,
    generationCount: generationCount ?? 0,
    completedCount: completedCount ?? 0,
    failedCount: failedCount ?? 0,
    totalCreditsSpent,
  });
});
