"use client";

import Link from "next/link";
import { ArrowLeft, Camera, Clock, Download, RectangleVertical, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {generations.map((generation, i) => (
              <div
                key={generation.id}
                className="hover-lift animate-fade-up overflow-hidden rounded-2xl border bg-card shadow-card"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative aspect-video bg-muted">
                  {generation.output_url ? (
                    <video
                      src={generation.output_url}
                      controls
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-xs font-medium text-muted-foreground">
                      {STATUS_LABEL[generation.status] ?? generation.status}
                    </div>
                  )}
                  <span
                    className={cn(
                      "absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                      generation.status === "completed" && "bg-success text-success-foreground",
                      generation.status === "failed" &&
                        "bg-destructive text-destructive-foreground",
                      (generation.status === "queued" || generation.status === "processing") &&
                        "bg-foreground/70 text-background",
                    )}
                  >
                    {STATUS_LABEL[generation.status] ?? generation.status}
                  </span>
                </div>
                <div className="space-y-3 p-4">
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
                  <p className="text-xs text-muted-foreground">
                    {new Date(generation.created_at).toLocaleString()}
                  </p>
                  {generation.status === "failed" && generation.error_message && (
                    <p className="text-xs text-destructive">{generation.error_message}</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-lg text-xs"
                    disabled={!generation.output_url}
                    asChild={!!generation.output_url}
                  >
                    {generation.output_url ? (
                      <a href={generation.output_url} download>
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    ) : (
                      <span>
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
