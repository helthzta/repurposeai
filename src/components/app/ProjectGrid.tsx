"use client";

import { Clock, Copy, Download, Layers, Loader2, Play, Trash2, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VideoThumbnail } from "@/components/app/VideoThumbnail";
import type { Generation, Project } from "@/lib/types";
import { downloadFile } from "@/lib/utils";

type ProjectWithGenerations = Project & { generations: Generation[] };

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ProjectGrid({ mode }: { mode: "projects" | "history" }) {
  const [projects, setProjects] = useState<ProjectWithGenerations[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (project: ProjectWithGenerations, url: string) => {
    setDownloadingId(project.id);
    try {
      await downloadFile(url, `${project.name.replace(/[^\w-]+/g, "_")}.mp4`);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load projects");
      setProjects(data.projects);
    } catch (err) {
      toast.error("Could not load projects", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete project");
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } catch (err) {
      toast.error("Delete failed", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/projects/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Could not duplicate project");
      // ponytail: only brand details are copied into a fresh draft, not the source
      // videos/analysis/scripts — full pipeline re-run is a bigger feature, not this one.
      toast.success("New draft created", {
        description: "Brand details copied — upload videos to continue.",
      });
      await load();
    } catch (err) {
      toast.error("Duplicate failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!projects.length) {
    return (
      <p className="py-20 text-center text-sm text-muted-foreground">
        No commercials yet — start one from the dashboard.
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project, i) => {
        const generations = project.generations ?? [];
        const latest = [...generations].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )[0];
        const href = mode === "history" ? `/dashboard/${project.id}` : `/projects/${project.id}`;
        const tokensUsed = generations.reduce((sum, g) => sum + (g.credits_charged ?? 0), 0);

        return (
          <div
            key={project.id}
            className="hover-lift animate-fade-up group overflow-hidden rounded-2xl border bg-card shadow-card"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Link href={href} className="relative block aspect-video overflow-hidden bg-muted">
              {latest?.output_url ? (
                <VideoThumbnail src={latest.output_url} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {latest && (
                <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-foreground/70 px-2.5 py-1 text-[11px] font-semibold text-background backdrop-blur">
                  <Clock className="h-3 w-3" />
                  {formatDuration(latest.duration_seconds)}
                </span>
              )}
            </Link>
            <div className="p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <Link href={href} className="min-w-0 hover:underline">
                  <h3 className="truncate text-sm font-bold">{project.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {new Date(project.created_at).toLocaleDateString()}
                    {latest && (
                      <>
                        <span className="text-border">·</span>
                        <Layers className="h-3 w-3" />
                        {latest.provider}
                      </>
                    )}
                    {mode === "history" && tokensUsed > 0 && (
                      <>
                        <span className="text-border">·</span>
                        <Zap className="h-3 w-3 text-warning" />
                        {tokensUsed} tokens
                      </>
                    )}
                  </p>
                </Link>
              </div>
              <div className="mt-3.5 flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-lg text-xs"
                  disabled={!latest?.output_url || downloadingId === project.id}
                  onClick={() => latest?.output_url && handleDownload(project, latest.output_url)}
                >
                  {downloadingId === project.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  aria-label="Duplicate brand details as a new draft"
                  disabled={busyId === project.id}
                  onClick={() => handleDuplicate(project.id)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                  disabled={busyId === project.id}
                  onClick={() => handleDelete(project.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
