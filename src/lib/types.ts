// App-level row shapes. Hand-written to match supabase/migrations/*.sql —
// there's no live project here to run `supabase gen types` against.

export type ProjectStatus =
  "draft" | "analyzing" | "scripted" | "generating" | "completed" | "failed";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  status: ProjectStatus;
  /** Cached output of the Ideas step, so navigating back to it doesn't regenerate different ideas. */
  script_ideas: ScriptIdea[] | null;
  created_at: string;
  updated_at: string;
}

export interface BrandProfile {
  id: string;
  project_id: string;
  brand_name: string | null;
  product_service: string | null;
  target_audience: string | null;
  tone: string | null;
  description: string | null;
  brand_colors: string[] | null;
  cta: string | null;
  logo_path: string | null;
  website_url: string | null;
  website_summary: string | null;
}

export type SourceVideoKind = "competitor" | "product" | "brand";

export interface SourceVideo {
  id: string;
  project_id: string;
  kind: SourceVideoKind;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

export interface VideoAnalysis {
  id: string;
  project_id: string;
  source_video_id: string;
  status: "processing" | "completed" | "failed";
  company: string | null;
  company_does: string | null;
  duration_seconds: number | null;
  viral_factor: string | null;
  hook: string | null;
  pain_point: string | null;
  context: string | null;
  emotional_trigger: string | null;
  audience: string | null;
  relief: string | null;
  hero: string | null;
  language: string | null;
  video_metrics: string | null;
  tone_of_voice: string | null;
  visual_style: string | null;
  error_message: string | null;
  created_at: string;
}

export type ScriptStyle = "emotional" | "humorous" | "high_conversion" | "custom";

/** A short, un-persisted concept shown before a full script is written — see IdeaStep.tsx. */
export interface ScriptIdea {
  style: ScriptStyle;
  title: string;
  hook: string;
  pitch: string;
}

export interface Script {
  id: string;
  project_id: string;
  analysis_id: string;
  style: ScriptStyle;
  title: string;
  hook: string | null;
  body: string;
  scene_descriptions: string | null;
  emotional_direction: string | null;
  cta: string | null;
  estimated_duration: string | null;
  /** The exact runtime this variant's scenes were written to fit — 15 or 30. Null for scripts written before this existed. */
  target_duration_seconds: 15 | 30 | null;
  language: string;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
}

export type VideoProviderName = "seedance" | "higgsfield";
export type AspectRatio = "9:16" | "16:9" | "1:1";
export type Quality = "standard" | "high" | "ultra";
export type GenerationStatus = "queued" | "processing" | "completed" | "failed";

export interface AiInsights {
  marketing_score: number;
  creativity_score: number;
  brand_match_score: number;
  emotional_impact: number;
  predicted_conversion: number;
}

export interface Generation {
  id: string;
  project_id: string;
  script_id: string;
  provider: VideoProviderName;
  duration_seconds: number;
  aspect_ratio: AspectRatio;
  quality: Quality;
  camera_style: string;
  status: GenerationStatus;
  prompt_used: string | null;
  provider_job_id: string | null;
  /** Set while a >maxClipDurationSeconds request is being rendered as chained clips; null for a normal single-call generation. */
  chain_stage: "clip1" | "clip2" | null;
  /** clip1's provider_job_id, kept once provider_job_id is overwritten by clip2's — needed to re-fetch clip1 for the final stitch. */
  chain_clip1_job_id: string | null;
  output_path: string | null;
  output_url: string | null;
  ai_insights: AiInsights | null;
  credits_charged: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Profile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: "starter" | "pro" | "enterprise";
  credits_balance: number;
  locale: string;
  theme: "light" | "system";
  notify_on_completion: boolean;
  is_admin: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}
