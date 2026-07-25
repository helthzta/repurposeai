import type { SupabaseClient } from "@supabase/supabase-js";
import type { Generation, Project, Script, VideoAnalysis } from "@/lib/types";

export type ProjectDetail = Project & {
  video_analyses: VideoAnalysis[];
  scripts: Script[];
  generations: Generation[];
};

/** Shared by GET /api/projects/[id] and the /dashboard/[projectId] page. */
export async function getProjectDetail(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<ProjectDetail | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `*, brand_profiles(*), source_videos(*),
       video_analyses(*),
       scripts(*),
       generations(*)`,
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as ProjectDetail | null;
}

export type WorkflowPhase = "analysis" | "ideas" | "script" | "settings" | "generating" | "result";

export interface WorkflowState {
  phase: WorkflowPhase;
  script: Script | null;
  generationId: string | null;
  /** Set only when resuming at "settings" because the last attempt failed — surfaced once so the reason isn't silently lost across a visit. */
  lastError: string | null;
}

/** Resumes a project at whichever step its DB state implies — no in-memory tracking needed. */
export function deriveWorkflowPhase(project: ProjectDetail): WorkflowState {
  const hasCompletedAnalysis = project.video_analyses?.some((a) => a.status === "completed");
  if (!hasCompletedAnalysis) {
    return { phase: "analysis", script: null, generationId: null, lastError: null };
  }

  const scripts = [...(project.scripts ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const script = scripts.find((s) => s.is_selected) ?? scripts[0] ?? null;
  if (!script) {
    return { phase: "ideas", script: null, generationId: null, lastError: null };
  }

  const generations = [...(project.generations ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latest = generations[0];
  if (!latest) {
    return { phase: "script", script, generationId: null, lastError: null };
  }
  if (latest.status === "completed") {
    return { phase: "result", script, generationId: latest.id, lastError: null };
  }
  if (latest.status === "failed") {
    return {
      phase: "settings",
      script,
      generationId: null,
      lastError: latest.error_message ?? "Generation failed",
    };
  }
  return { phase: "generating", script, generationId: latest.id, lastError: null };
}
