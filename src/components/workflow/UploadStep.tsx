import { CloudUpload, FileVideo, Link2, Loader2, Palette, Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandProfileDialog } from "@/components/brand/BrandProfileDialog";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { BrandProfile, SourceVideoKind } from "@/lib/types";

async function uploadSourceVideo(projectId: string, kind: SourceVideoKind, file: File) {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, kind, filename: file.name }),
  });
  if (!signRes.ok) throw new Error("Could not prepare upload");
  const { bucket, path, token } = await signRes.json();

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file);
  if (uploadError) throw uploadError;

  const confirmRes = await fetch("/api/uploads/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      kind,
      path,
      filename: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
    }),
  });
  if (!confirmRes.ok) throw new Error("Could not save the uploaded video");
}

async function uploadVideoFromLink(projectId: string, kind: SourceVideoKind, url: string) {
  const res = await fetch("/api/uploads/from-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, kind, url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Could not fetch the video from that link");
  }
}

function SecondaryUpload({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="flex h-16 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
      <input
        type="file"
        accept=".mp4,.mov,.webm"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <Upload className="h-3.5 w-3.5" />
      {file ? file.name : label}
    </label>
  );
}

export function UploadStep({ onContinue }: { onContinue: (projectId: string) => void }) {
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");
  const [dragging, setDragging] = useState(false);
  const [competitorFile, setCompetitorFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [brandFile, setBrandFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [videoLink, setVideoLink] = useState("");

  const [brandProfiles, setBrandProfiles] = useState<BrandProfile[]>([]);
  const [brandProfileId, setBrandProfileId] = useState<string | null>(null);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);

  useEffect(() => {
    fetch("/api/brand-profiles")
      .then((res) => res.json())
      .then((data) => {
        const profiles = (data.brandProfiles ?? []) as BrandProfile[];
        setBrandProfiles(profiles);
        // Default to the user's default brand, else whichever's newest.
        setBrandProfileId((profiles.find((p) => p.is_default) ?? profiles[0])?.id ?? null);
      })
      .catch(() => toast.error("Could not load brand profiles"));
  }, []);

  const handleBrandCreated = (profile: BrandProfile) => {
    setBrandProfiles((prev) => [profile, ...prev]);
    setBrandProfileId(profile.id);
  };

  const acceptFile = (file?: File) => {
    if (!file) return;
    setCompetitorFile(file);
    toast.success("Video added", { description: file.name });
  };

  const switchToFile = () => {
    setUploadMode("file");
    setVideoLink("");
  };
  const switchToLink = () => {
    setUploadMode("link");
    setCompetitorFile(null);
  };

  const handleSubmit = async () => {
    const trimmedVideoLink = videoLink.trim();
    if (!competitorFile && !trimmedVideoLink) {
      toast.error("Add your competitor's ad — upload a file or paste a video link");
      return;
    }
    if (!brandProfileId) {
      toast.error("Pick a brand profile — or add a new one — before starting analysis");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandProfileId }),
      });
      if (!res.ok) throw new Error("Could not create the project");
      const { project } = await res.json();

      if (competitorFile) {
        await uploadSourceVideo(project.id, "competitor", competitorFile);
      } else {
        await uploadVideoFromLink(project.id, "competitor", trimmedVideoLink);
      }
      if (productFile) await uploadSourceVideo(project.id, "product", productFile);
      if (brandFile) await uploadSourceVideo(project.id, "brand", brandFile);

      onContinue(project.id);
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-up space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          if (uploadMode !== "file") return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (uploadMode !== "file") return;
          acceptFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-card px-6 py-14 text-center transition-all duration-300 sm:py-20",
          uploadMode === "file" && dragging
            ? "border-primary bg-accent shadow-glow"
            : "border-border shadow-card",
        )}
      >
        <div className="mb-7 inline-flex rounded-xl border bg-muted/40 p-1">
          <button
            type="button"
            onClick={switchToFile}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
              uploadMode === "file"
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload File
          </button>
          <button
            type="button"
            onClick={switchToLink}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
              uploadMode === "link"
                ? "bg-card text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Link2 className="h-3.5 w-3.5" />
            Paste Link
          </button>
        </div>

        {uploadMode === "file" ? (
          <>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent animate-float">
              {competitorFile ? (
                <FileVideo className="h-7 w-7 text-primary" />
              ) : (
                <CloudUpload className="h-7 w-7 text-primary" />
              )}
            </div>
            <h2 className="mt-6 text-lg font-bold tracking-tight sm:text-xl">
              {competitorFile?.name ?? "Drag & drop your competitor's ad"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {competitorFile ? "Ready for AI analysis" : "Supports MP4, MOV and WebM up to 500 MB"}
            </p>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <label>
                <input
                  type="file"
                  accept=".mp4,.mov,.webm"
                  className="sr-only"
                  onChange={(e) => acceptFile(e.target.files?.[0])}
                />
                <Button asChild className="btn-glow rounded-xl font-semibold">
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Browse Files
                  </span>
                </Button>
              </label>
            </div>
          </>
        ) : (
          <>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent">
              <Link2 className="h-7 w-7 text-primary" />
            </div>
            <h2 className="mt-6 text-lg font-bold tracking-tight sm:text-xl">
              Paste a link to your competitor's ad
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              We'll fetch the video from the URL and analyze it the same way
            </p>
            <Input
              type="url"
              placeholder="https://..."
              className="mt-7 h-11 w-full max-w-md rounded-xl text-center"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
            />
          </>
        )}
      </div>

      {/* Brand profile */}
      <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold">Brand Profile</h3>
            <p className="text-xs text-muted-foreground">Tell the AI who it's writing for</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          {brandProfiles.length > 0 && (
            <Select value={brandProfileId ?? undefined} onValueChange={setBrandProfileId}>
              <SelectTrigger className="h-11 flex-1 rounded-xl">
                <SelectValue placeholder="Pick a brand profile" />
              </SelectTrigger>
              <SelectContent>
                {brandProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                    {p.brand_name ? ` — ${p.brand_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 rounded-xl font-semibold"
            onClick={() => setBrandDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add new brand
          </Button>
        </div>
        {brandProfiles.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            No brand profiles yet — add one to get started. It's saved to your account for reuse
            next time.
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Tone and CTA aren't set here — they're picked automatically to match what made the
          uploaded video work.
        </p>

        <div className="mt-8 flex justify-end">
          <Button
            size="lg"
            className="btn-glow h-12 rounded-xl px-8 font-semibold"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Start AI Analysis
          </Button>
        </div>
      </div>

      <BrandProfileDialog
        open={brandDialogOpen}
        onOpenChange={setBrandDialogOpen}
        editing={null}
        onSaved={handleBrandCreated}
      />
    </div>
  );
}
