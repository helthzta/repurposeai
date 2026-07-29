import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BrandProfile,
  Generation,
  Project,
  Script,
  ScriptIdea,
  VideoAnalysis,
} from "@/lib/types";

export type ProjectDetail = Project & {
  brand_profiles: BrandProfile | null;
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
  /** The current 15s/30s pair written for the picked idea — what the Ideas->Script hand-off shows. */
  scripts: Script[];
  /** Whichever of `scripts` is active/selected — used once past the Script step. */
  script: Script | null;
  generationId: string | null;
  /** Cached ideas so the Ideas step can resume without regenerating a different set. */
  ideas: ScriptIdea[] | null;
  /** Set only when resuming at "settings" because the last attempt failed — surfaced once so the reason isn't silently lost across a visit. */
  lastError: string | null;
}

/** Scripts are written in 15s/30s pairs per idea — keep only the newest of each duration, so an older idea's leftovers don't linger. */
function currentScriptPair(scripts: Script[]): Script[] {
  const sorted = [...scripts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const seen = new Set<number>();
  const pair: Script[] = [];
  for (const s of sorted) {
    if (s.target_duration_seconds == null || seen.has(s.target_duration_seconds)) continue;
    seen.add(s.target_duration_seconds);
    pair.push(s);
  }
  return pair.sort((a, b) => (a.target_duration_seconds ?? 0) - (b.target_duration_seconds ?? 0));
}

/** Resumes a project at whichever step its DB state implies — no in-memory tracking needed. */
export function deriveWorkflowPhase(project: ProjectDetail): WorkflowState {
  const ideas = project.script_ideas ?? null;
  const hasCompletedAnalysis = project.video_analyses?.some((a) => a.status === "completed");
  if (!hasCompletedAnalysis) {
    return {
      phase: "analysis",
      scripts: [],
      script: null,
      generationId: null,
      ideas: null,
      lastError: null,
    };
  }

  const scripts = currentScriptPair(project.scripts ?? []);
  const script = scripts.find((s) => s.is_selected) ?? scripts[0] ?? null;
  if (!script) {
    return { phase: "ideas", scripts, script: null, generationId: null, ideas, lastError: null };
  }

  const generations = [...(project.generations ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latest = generations[0];
  if (!latest) {
    return { phase: "script", scripts, script, generationId: null, ideas, lastError: null };
  }
  if (latest.status === "completed") {
    return { phase: "result", scripts, script, generationId: latest.id, ideas, lastError: null };
  }
  if (latest.status === "failed") {
    return {
      phase: "settings",
      scripts,
      script,
      generationId: null,
      ideas,
      lastError: latest.error_message ?? "Generation failed",
    };
  }
  return { phase: "generating", scripts, script, generationId: latest.id, ideas, lastError: null };
}
