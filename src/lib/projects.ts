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

/**
 * `generations.output_url` isn't persisted — it's a private-bucket signed URL that expires, so
 * it has to be (re)signed on every read from `output_path`, never trusted from the DB column
 * (which stays null). Signs every completed generation's path in a single batch call.
 */
export async function signGenerationOutputs<
  T extends Pick<Generation, "id" | "output_path" | "status" | "output_url">,
>(supabase: SupabaseClient, generations: T[]): Promise<T[]> {
  const paths = generations
    .filter((g) => g.status === "completed" && g.output_path)
    .map((g) => g.output_path as string);
  if (paths.length === 0) return generations;

  const { data: signed, error } = await supabase.storage
    .from("generated-videos")
    .createSignedUrls(paths, 3600);
  if (error) throw error;

  const urlByPath = new Map(
    (signed ?? [])
      .filter((s) => s.path && s.signedUrl)
      .map((s) => [s.path as string, s.signedUrl as string]),
  );
  return generations.map((g) =>
    g.output_path && urlByPath.has(g.output_path)
      ? { ...g, output_url: urlByPath.get(g.output_path)! }
      : g,
  );
}

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
  if (!data) return null;

  const project = data as ProjectDetail;
  project.generations = await signGenerationOutputs(supabase, project.generations ?? []);
  return project;
}

/** A project's selected brand profile — shared by every route that needs brand context for AI calls. */
export async function requireProjectBrand(
  client: SupabaseClient,
  projectId: string,
): Promise<BrandProfile> {
  const { data, error } = await client
    .from("projects")
    .select("brand_profiles(*)")
    .eq("id", projectId)
    .single();
  if (error) throw error;
  const brand = (data as unknown as { brand_profiles: BrandProfile | null }).brand_profiles;
  if (!brand) throw new Error("Project has no brand profile selected");
  return brand;
}

export type WorkflowPhase = "analysis" | "ideas" | "settings" | "generating" | "result";

export interface WorkflowState {
  phase: WorkflowPhase;
  /** The current script variants (15s and 30s) written for the picked idea — the Settings step's length picker. */
  scripts: Script[];
  /** Whichever of `scripts` is active/selected. */
  script: Script | null;
  generationId: string | null;
  /** Cached ideas so the Ideas step can resume without regenerating a different set. */
  ideas: ScriptIdea[] | null;
  /** Set only when resuming at "settings" because the last attempt failed — surfaced once so the reason isn't silently lost across a visit. */
  lastError: string | null;
  /** The analyzed source video's tone_of_voice, surfaced on the Idea step — null if analysis hasn't completed or didn't detect one. */
  originalTone: string | null;
}

/** Keep only the newest script per duration, so an older idea's leftovers don't linger. */
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
  const completedAnalyses = [...(project.video_analyses ?? [])]
    .filter((a) => a.status === "completed")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const originalTone = completedAnalyses[0]?.tone_of_voice ?? null;
  if (!completedAnalyses.length) {
    return {
      phase: "analysis",
      scripts: [],
      script: null,
      generationId: null,
      ideas: null,
      lastError: null,
      originalTone,
    };
  }

  const scripts = currentScriptPair(project.scripts ?? []);
  const script = scripts.find((s) => s.is_selected) ?? scripts[0] ?? null;
  if (!script) {
    return {
      phase: "ideas",
      scripts,
      script: null,
      generationId: null,
      ideas,
      lastError: null,
      originalTone,
    };
  }

  const generations = [...(project.generations ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latest = generations[0];
  if (!latest) {
    return {
      phase: "settings",
      scripts,
      script,
      generationId: null,
      ideas,
      lastError: null,
      originalTone,
    };
  }
  if (latest.status === "completed") {
    return {
      phase: "result",
      scripts,
      script,
      generationId: latest.id,
      ideas,
      lastError: null,
      originalTone,
    };
  }
  if (latest.status === "failed") {
    return {
      phase: "settings",
      scripts,
      script,
      generationId: null,
      ideas,
      lastError: latest.error_message ?? "Generation failed",
      originalTone,
    };
  }
  return {
    phase: "generating",
    scripts,
    script,
    generationId: latest.id,
    ideas,
    lastError: null,
    originalTone,
  };
}
