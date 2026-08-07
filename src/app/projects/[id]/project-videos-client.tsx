"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Clock,
  Download,
  FileText,
  Loader2,
  Play,
  RectangleVertical,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { VideoThumbnail } from "@/components/app/VideoThumbnail";
import { AiInsightsList, ExpandableTextCard } from "@/components/generation/GenerationDetails";
import { cn, downloadFile } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { ProjectDetail } from "@/lib/projects";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  processing: "Processing",
  completed: "Ready",
  failed: "Failed",
};

export function ProjectVideosClient({ project }: { project: ProjectDetail }) {
  const generations = [...(project.generations ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handleDownload = async (generationId: string, url: string) => {
    setDownloadingId(generationId);
    try {
      await downloadFile(url, `${project.name.replace(/[^\w-]+/g, "_")}-${generationId}.mp4`);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const logoUrl = project.brand_profiles?.logo_path
    ? createClient().storage.from("brand-logos").getPublicUrl(project.brand_profiles.logo_path).data
        .publicUrl
    : null;

  return (
    <AppShell title={project.name}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-xl" asChild>
            <Link href="/projects" aria-label="Back to projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              className="h-9 w-9 rounded-lg border bg-card object-contain p-1"
            />
          )}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight">{project.name}</h2>
            <p className="text-xs text-muted-foreground">
              {generations.length} {generations.length === 1 ? "video" : "videos"} generated
            </p>
          </div>
        </div>

        {generations.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            No commercials generated for this project yet.
          </p>
        ) : (
          <div className="space-y-6">
            {generations.map((generation, i) => {
              const script =
                (project.scripts ?? []).find((s) => s.id === generation.script_id) ?? null;

              return (
                <div
                  key={generation.id}
                  className="animate-fade-up rounded-3xl border bg-card p-6 shadow-card"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-bold",
                          generation.status === "completed" && "bg-success text-success-foreground",
                          generation.status === "failed" &&
                            "bg-destructive text-destructive-foreground",
                          (generation.status === "queued" || generation.status === "processing") &&
                            "bg-foreground/70 text-background",
                        )}
                      >
                        {STATUS_LABEL[generation.status] ?? generation.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(generation.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(generation.duration_seconds)}
                      </span>
                      <span className="flex items-center gap-1">
                        <RectangleVertical className="h-3 w-3" />
                        {generation.aspect_ratio}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        <Camera className="h-3 w-3" />
                        {generation.camera_style}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        <Sparkles className="h-3 w-3" />
                        {generation.quality}
                      </span>
                    </div>
                  </div>

                  {generation.status === "failed" && generation.error_message && (
                    <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                      {generation.error_message}
                    </p>
                  )}

                  <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="grid gap-4 sm:grid-cols-[176px_minmax(0,1fr)]">
                      <div className="space-y-2.5">
                        <div className="overflow-hidden rounded-2xl border bg-muted">
                          <div className="relative aspect-[9/16] w-full">
                            {generation.output_url ? (
                              playingId === generation.id ? (
                                <video
                                  src={generation.output_url}
                                  controls
                                  autoPlay
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPlayingId(generation.id)}
                                  aria-label="Play video"
                                  className="group relative block h-full w-full"
                                >
                                  <VideoThumbnail
                                    src={generation.output_url}
                                    className="h-full w-full object-cover"
                                  />
                                  <span className="absolute inset-0 grid place-items-center bg-foreground/0 transition-colors group-hover:bg-foreground/20">
                                    <span className="grid h-10 w-10 place-items-center rounded-full bg-background/90 shadow-lift transition-transform group-hover:scale-105">
                                      <Play className="h-4 w-4 translate-x-0.5 text-foreground" />
                                    </span>
                                  </span>
                                </button>
                              )
                            ) : (
                              <div className="grid h-full place-items-center px-2 text-center text-xs font-medium text-muted-foreground">
                                {STATUS_LABEL[generation.status] ?? generation.status}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-lg text-xs"
                          disabled={!generation.output_url || downloadingId === generation.id}
                          onClick={() =>
                            generation.output_url &&
                            handleDownload(generation.id, generation.output_url)
                          }
                        >
                          {downloadingId === generation.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Download
                        </Button>
                      </div>

                      <div className="self-start">
                        {/* Prefer the frozen snapshot on the generation (what actually produced
                            this video) over the live script row, which can have since been
                            edited/regenerated — that would show text that never went to Seedance. */}
                        <ExpandableTextCard
                          icon={FileText}
                          title="Script Used"
                          content={generation.script_body ?? script?.body ?? null}
                          emptyText="No script selected."
                        />
                      </div>
                    </div>

                    <div className="h-fit rounded-2xl border bg-background p-5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary">
                          <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
                        </span>
                        <h3 className="text-[15px] font-bold">AI Insights</h3>
                      </div>
                      <div className="mt-6">
                        <AiInsightsList insights={generation.ai_insights} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
