import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { deriveWorkflowPhase, getProjectDetail } from "@/lib/projects";
import { ProjectWorkflowClient } from "./project-workflow-client";

export const metadata: Metadata = {
  title: "Commercial — Repurpose AI",
  description: "Analyze the ad, pick a script, and generate your AI commercial.",
};

export default async function ProjectDashboard({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // middleware.ts already gates /dashboard/*, but a server component throwing
  // an uncaught 401 renders a hard error page instead of degrading — fall back
  // to the same /login redirect middleware does, in case a session ever slips
  // through (expired cookie mid-request, etc).
  let supabase, user;
  try {
    ({ supabase, user } = await requireUser());
  } catch {
    redirect("/login");
  }

  const project = await getProjectDetail(supabase, user.id, projectId);
  if (!project) notFound();

  const { phase, scripts, script, generationId, ideas, lastError } = deriveWorkflowPhase(project);

  return (
    <ProjectWorkflowClient
      projectId={projectId}
      initialPhase={phase}
      initialScripts={scripts}
      initialScript={script}
      initialGenerationId={generationId}
      initialIdeas={ideas}
      initialError={lastError}
    />
  );
}
