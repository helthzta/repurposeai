import { CloudUpload, FileVideo, ImageUp, Loader2, Palette, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { SourceVideoKind } from "@/lib/types";

type UploadKind = SourceVideoKind | "logo";

async function uploadSourceVideo(projectId: string, kind: UploadKind, file: File) {
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
  const [dragging, setDragging] = useState(false);
  const [competitorFile, setCompetitorFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [brandFile, setBrandFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [productService, setProductService] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [description, setDescription] = useState("");
  const [brandColors, setBrandColors] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [websiteLink, setWebsiteLink] = useState("");

  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const acceptFile = (file?: File) => {
    if (!file) return;
    setCompetitorFile(file);
    toast.success("Video added", { description: file.name });
  };

  const handleSubmit = async () => {
    const trimmedVideoLink = videoLink.trim();
    if (!competitorFile && !trimmedVideoLink) {
      toast.error("Add your competitor's ad — upload a file or paste a video link");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          productService,
          targetAudience,
          description,
          websiteUrl: websiteLink.trim() || undefined,
          brandColors: brandColors
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
        }),
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
      if (logoFile) await uploadSourceVideo(project.id, "logo", logoFile);

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
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          acceptFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-card px-6 py-14 text-center transition-all duration-300 sm:py-20",
          dragging ? "border-primary bg-accent shadow-glow" : "border-border shadow-card",
        )}
      >
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
          {competitorFile
            ? "Ready for AI analysis"
            : "Supports MP4, MOV and WebM up to 500 MB — or paste a Video Link below instead"}
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

        <div className="mt-6 grid w-full max-w-lg gap-2.5 sm:grid-cols-2">
          <SecondaryUpload
            label="Product ad (optional)"
            file={productFile}
            onChange={setProductFile}
          />
          <SecondaryUpload label="Brand ad (optional)" file={brandFile} onChange={setBrandFile} />
        </div>
      </div>

      {/* Brand info */}
      <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold">Brand Information</h3>
            <p className="text-xs text-muted-foreground">Tell the AI who it's writing for</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Brand Name</Label>
            <Input
              id="brand-name"
              placeholder="Lumière Fragrance Co."
              className="h-11 rounded-xl"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service">Service / Product</Label>
            <Input
              id="service"
              placeholder="Premium D2C perfume"
              className="h-11 rounded-xl"
              value={productService}
              onChange={(e) => setProductService(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audience">Target Audience</Label>
            <Input
              id="audience"
              placeholder="Women 24–38, urban, aspirational"
              className="h-11 rounded-xl"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="colors">Brand Colors</Label>
            <Input
              id="colors"
              placeholder="#2563EB, #F8FAFC"
              className="h-11 rounded-xl"
              value={brandColors}
              onChange={(e) => setBrandColors(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video-link">Video Link</Label>
            <Input
              id="video-link"
              type="url"
              placeholder="https://... (instead of uploading a file above)"
              className="h-11 rounded-xl"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website-link">Website Link</Label>
            <Input
              id="website-link"
              type="url"
              placeholder="https://yourbrand.com"
              className="h-11 rounded-xl"
              value={websiteLink}
              onChange={(e) => setWebsiteLink(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              We'll scan this for brand details to ground the scripts in.
            </p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Brand Description</Label>
            <Textarea
              id="description"
              placeholder="What makes your brand different?"
              className="min-h-24 rounded-xl"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="logo">Brand Logo</Label>
            <div className="flex items-center gap-3">
              {logoPreview ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-muted">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-full w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => handleLogoChange(null)}
                    aria-label="Remove logo"
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-foreground/70 text-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="logo"
                  className="flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <ImageUp className="h-5 w-5" />
                </label>
              )}
              <input
                id="logo"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                className="sr-only"
                onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP or SVG, up to 10MB. Used in the generated commercial's branding.
              </p>
            </div>
          </div>
        </div>
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
    </div>
  );
}
