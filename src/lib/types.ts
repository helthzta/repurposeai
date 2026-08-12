// App-level row shapes. Hand-written to match supabase/migrations/*.sql —
// there's no live project here to run `supabase gen types` against.

export type ProjectStatus =
  "draft" | "analyzing" | "scripted" | "generating" | "completed" | "failed";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  status: ProjectStatus;
  /** Which of the user's reusable brand profiles this project generates for. */
  brand_profile_id: string | null;
  /** Cached output of the Ideas step, so navigating back to it doesn't regenerate different ideas. */
  script_ideas: ScriptIdea[] | null;
  created_at: string;
  updated_at: string;
}

/** Reusable, user-owned brand info — a user can have several, picked per project instead of re-entered each time. */
export interface BrandProfile {
  id: string;
  user_id: string;
  /** User-facing name for this profile, e.g. "Brand A" — distinct from brand_name, which is the actual brand's name. */
  label: string;
  is_default: boolean;
  brand_name: string | null;
  product_service: string | null;
  target_audience: string | null;
  tone: string | null;
  description: string | null;
  brand_colors: string[] | null;
  cta: string | null;
  logo_path: string | null;
  /** Product/packaging/mood images for AI context — replaces the website link as the way to describe a brand. */
  context_image_paths: string[] | null;
  created_at: string;
  updated_at: string;
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

// "hinglish" isn't a real ISO 639-1 code (there isn't one for Hindi-English code-mixing) — kept
// alongside the real codes anyway since this is the app's own internal language identifier, not
// something round-tripped through an ISO lookup.
export type ScriptLanguage = "en" | "bn" | "hi" | "hinglish";

export const SCRIPT_LANGUAGE_LABELS: Record<ScriptLanguage, string> = {
  en: "English",
  bn: "Bengali",
  hi: "Hindi",
  hinglish: "Hinglish",
};

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
  subtitles: boolean;
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
  /** Snapshot of the script body at submit time — use this for display, not the live script row, which can drift after edits/regenerates. */
  script_body: string | null;
  provider_job_id: string | null;
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
  plan: "starter" | "pro" | "custom";
  credits_balance: number;
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
