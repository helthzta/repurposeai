// App-level row shapes. Hand-written to match supabase/migrations/*.sql —
// there's no live project here to run `supabase gen types` against.

export type ProjectStatus =
  "draft" | "analyzing" | "scripted" | "generating" | "completed" | "failed";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  status: ProjectStatus;
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
  business_category: string | null;
  duration_seconds: number | null;
  hook: string | null;
  audience: string | null;
  pain_point: string | null;
  context: string | null;
  emotional_trigger: string | null;
  hero: string | null;
  marketing_strategy: string | null;
  offer: string | null;
  cta: string | null;
  narrative_structure: string | null;
  tone_of_voice: string | null;
  visual_style: string | null;
  error_message: string | null;
  created_at: string;
}

export type ScriptStyle = "emotional" | "humorous" | "high_conversion" | "custom";

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
  full_name: string | null;
  avatar_url: string | null;
  plan: "starter" | "pro" | "enterprise";
  credits_balance: number;
  locale: string;
  theme: "light" | "system";
  notify_on_completion: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}
