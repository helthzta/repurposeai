"use client";

import { ImageUp, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import type { BrandProfile } from "@/lib/types";

async function uploadLogo(brandProfileId: string, file: File): Promise<string> {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brandProfileId, kind: "logo", filename: file.name }),
  });
  if (!signRes.ok) throw new Error("Could not prepare logo upload");
  const { bucket, path, token } = await signRes.json();

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file);
  if (uploadError) throw uploadError;

  const confirmRes = await fetch("/api/uploads/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brandProfileId, kind: "logo", path, filename: file.name }),
  });
  if (!confirmRes.ok) throw new Error("Could not save the logo");
  const { brandProfile } = await confirmRes.json();
  return brandProfile.logo_path as string;
}

/** Shared Add/Edit brand profile modal — used from Profile and inline from the Upload step. */
export function BrandProfileDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null creates a new profile; a BrandProfile edits it in place. */
  editing: BrandProfile | null;
  onSaved: (profile: BrandProfile) => void;
}) {
  const [label, setLabel] = useState(editing?.label ?? "");
  const [brandName, setBrandName] = useState(editing?.brand_name ?? "");
  const [productService, setProductService] = useState(editing?.product_service ?? "");
  const [targetAudience, setTargetAudience] = useState(editing?.target_audience ?? "");
  const [brandColors, setBrandColors] = useState(editing?.brand_colors?.join(", ") ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(editing?.website_url ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);

  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const handleSubmit = async () => {
    if (!label.trim()) {
      setLabelError('Give this brand profile a name, e.g. "Brand A"');
      return;
    }
    setLabelError(null);
    setSaving(true);
    try {
      const payload = {
        label: label.trim(),
        brandName: brandName.trim() || null,
        productService: productService.trim() || null,
        targetAudience: targetAudience.trim() || null,
        description: description.trim() || null,
        brandColors: brandColors
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        websiteUrl: websiteUrl.trim() || null,
      };

      const res = await fetch(
        editing ? `/api/brand-profiles/${editing.id}` : "/api/brand-profiles",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error("Could not save the brand profile");
      let { brandProfile } = await res.json();

      if (logoFile) {
        const logoPath = await uploadLogo(brandProfile.id, logoFile);
        brandProfile = { ...brandProfile, logo_path: logoPath };
      }

      toast.success(editing ? "Brand profile updated" : "Brand profile created");
      onSaved(brandProfile);
      onOpenChange(false);
    } catch (err) {
      toast.error("Couldn't save brand profile", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit brand profile" : "Add a brand profile"}</DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bp-label">Profile Name</Label>
            <Input
              id="bp-label"
              placeholder="e.g. Brand A"
              className={`h-11 rounded-xl ${labelError ? "border-destructive" : ""}`}
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (labelError) setLabelError(null);
              }}
            />
            {labelError && <p className="text-xs text-destructive">{labelError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-brand-name">Brand Name</Label>
            <Input
              id="bp-brand-name"
              placeholder="Lumière Fragrance Co."
              className="h-11 rounded-xl"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-service">Service / Product</Label>
            <Input
              id="bp-service"
              placeholder="Premium D2C perfume"
              className="h-11 rounded-xl"
              value={productService}
              onChange={(e) => setProductService(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-audience">Target Audience</Label>
            <Input
              id="bp-audience"
              placeholder="Women 24–38, urban, aspirational"
              className="h-11 rounded-xl"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bp-colors">Brand Colors</Label>
            <Input
              id="bp-colors"
              placeholder="#2563EB, #F8FAFC"
              className="h-11 rounded-xl"
              value={brandColors}
              onChange={(e) => setBrandColors(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bp-website">Website Link</Label>
            <Input
              id="bp-website"
              type="url"
              placeholder="https://yourbrand.com"
              className="h-11 rounded-xl"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bp-description">Brand Description</Label>
            <Textarea
              id="bp-description"
              placeholder="What makes your brand different?"
              className="min-h-20 rounded-xl"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bp-logo">Brand Logo</Label>
            <div className="flex items-center gap-3">
              {logoPreview || editing?.logo_path ? (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted">
                  <img
                    src={
                      logoPreview ??
                      createClient().storage.from("brand-logos").getPublicUrl(editing!.logo_path!)
                        .data.publicUrl
                    }
                    alt="Logo preview"
                    className="h-full w-full object-contain"
                  />
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => handleLogoChange(null)}
                      aria-label="Remove logo"
                      className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-foreground/70 text-background"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : (
                <label
                  htmlFor="bp-logo"
                  className="flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <ImageUp className="h-5 w-5" />
                </label>
              )}
              <input
                id="bp-logo"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                className="sr-only"
                onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="btn-glow rounded-xl font-semibold"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Create profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
