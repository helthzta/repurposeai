"use client";

import { ImageUp, Loader2, Plus, X } from "lucide-react";
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

/** Shared by logo + context-image uploads — both go through sign/confirm, scoped to the brand profile. */
async function uploadBrandImage(
  brandProfileId: string,
  kind: "logo" | "context_image",
  file: File,
): Promise<BrandProfile> {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brandProfileId, kind, filename: file.name }),
  });
  if (!signRes.ok) throw new Error("Could not prepare image upload");
  const { bucket, path, token } = await signRes.json();

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file);
  if (uploadError) throw uploadError;

  const confirmRes = await fetch("/api/uploads/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brandProfileId, kind, path, filename: file.name }),
  });
  if (!confirmRes.ok) throw new Error("Could not save the image");
  const { brandProfile } = await confirmRes.json();
  return brandProfile as BrandProfile;
}

const MAX_CONTEXT_IMAGES = 5;
const MAX_BRAND_COLORS = 6;
const DEFAULT_SWATCH = "#2563eb";
const isHexColor = (value: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
/** Accepts "2563eb" or "#2563eb" typed by hand; returns null if it's not a valid hex once normalized. */
const normalizeHex = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return isHexColor(withHash) ? withHash : null;
};

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
  const [brandColors, setBrandColors] = useState<string[]>(editing?.brand_colors ?? []);
  // Staged value for the "add a color" control — see handleDraftColorSubmit for why this is
  // separate from brandColors instead of writing straight into it.
  const [draftHex, setDraftHex] = useState("");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  // Already-saved context images (can be removed) vs. newly picked files (uploaded on save).
  const [existingContextImages, setExistingContextImages] = useState(
    editing?.context_image_paths ?? [],
  );
  const [contextImageFiles, setContextImageFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [labelError, setLabelError] = useState<string | null>(null);

  const totalContextImages = existingContextImages.length + contextImageFiles.length;

  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const handleContextImagesAdded = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_CONTEXT_IMAGES - totalContextImages;
    if (room <= 0) {
      toast.error(`Up to ${MAX_CONTEXT_IMAGES} context images`);
      return;
    }
    setContextImageFiles((prev) => [...prev, ...Array.from(files).slice(0, room)]);
  };

  const handleColorAdded = (hex: string) => {
    setBrandColors((prev) => {
      if (prev.length >= MAX_BRAND_COLORS) {
        toast.error(`Up to ${MAX_BRAND_COLORS} brand colors`);
        return prev;
      }
      return [...prev, hex];
    });
  };

  const handleColorChanged = (index: number, hex: string) => {
    setBrandColors((prev) => prev.map((c, i) => (i === index ? hex : c)));
  };

  const handleColorRemoved = (index: number) => {
    setBrandColors((prev) => prev.filter((_, i) => i !== index));
  };

  // Wheel/spectrum drag and hex typing both only ever touch draftHex — nothing lands in brandColors
  // until "Add" is clicked. A native color input's onChange fires on every intermediate tick while
  // dragging the wheel, not just once on release; wiring that straight into the list meant one drag
  // gesture silently added several colors at once (confusing — looked like colors were "randomly
  // getting selected" from a scroll/drag).
  const handleDraftColorSubmit = () => {
    const hex = normalizeHex(draftHex);
    if (!hex) {
      toast.error("Enter a valid hex code, e.g. #2563EB");
      return;
    }
    handleColorAdded(hex);
    setDraftHex("");
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
        brandColors,
        // Only meaningful on edit (drops a removed image) — a new profile has none yet.
        contextImagePaths: existingContextImages,
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
        brandProfile = await uploadBrandImage(brandProfile.id, "logo", logoFile);
      }
      for (const file of contextImageFiles) {
        brandProfile = await uploadBrandImage(brandProfile.id, "context_image", file);
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Brand Colors</Label>
            <p className="text-xs text-muted-foreground">
              {brandColors.length === 0
                ? `Choose a color below, then click Add — up to ${MAX_BRAND_COLORS}.`
                : "Click a swatch to change it, or the × to remove it."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {brandColors.map((hex, i) => (
                <div key={`color-${i}`} className="relative flex items-center gap-1">
                  <label
                    htmlFor={`bp-color-${i}`}
                    title={isHexColor(hex) ? hex : "Not a valid hex color"}
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border shadow-sm"
                    style={isHexColor(hex) ? { backgroundColor: hex } : undefined}
                  >
                    {!isHexColor(hex) && (
                      <span className="text-[9px] font-medium text-muted-foreground">?</span>
                    )}
                  </label>
                  <input
                    id={`bp-color-${i}`}
                    type="color"
                    value={isHexColor(hex) ? hex : DEFAULT_SWATCH}
                    onChange={(e) => handleColorChanged(i, e.target.value)}
                    className="sr-only"
                  />
                  <Input
                    aria-label={`Hex code for color ${i + 1}`}
                    value={hex}
                    onChange={(e) => handleColorChanged(i, e.target.value)}
                    onBlur={(e) => {
                      const normalized = normalizeHex(e.target.value);
                      if (normalized) handleColorChanged(i, normalized);
                    }}
                    placeholder="#2563EB"
                    className="h-9 w-24 rounded-lg px-2 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleColorRemoved(i)}
                    aria-label="Remove color"
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            {brandColors.length < MAX_BRAND_COLORS && (
              <div className="flex items-center gap-1.5 rounded-xl border border-dashed p-1.5">
                <label
                  htmlFor="bp-color-draft"
                  title="Choose a color"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  style={isHexColor(draftHex) ? { backgroundColor: draftHex } : undefined}
                >
                  {!isHexColor(draftHex) && <Plus className="h-4 w-4" />}
                </label>
                <input
                  id="bp-color-draft"
                  type="color"
                  // Only ever previews here — see handleDraftColorSubmit for why this doesn't
                  // write to brandColors directly.
                  value={isHexColor(draftHex) ? draftHex : DEFAULT_SWATCH}
                  onChange={(e) => setDraftHex(e.target.value)}
                  className="sr-only"
                />
                <Input
                  aria-label="Hex code for the new color"
                  value={draftHex}
                  onChange={(e) => setDraftHex(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleDraftColorSubmit();
                    }
                  }}
                  placeholder="#2563EB"
                  className="h-9 flex-1 rounded-lg px-2 font-mono text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0 rounded-lg px-3"
                  onClick={handleDraftColorSubmit}
                  disabled={!normalizeHex(draftHex)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bp-context-images">Brand Context Images</Label>
            <p className="text-xs text-muted-foreground">
              Product, packaging, or mood shots — used as AI context instead of a website link.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {existingContextImages.map((path) => (
                <div
                  key={path}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted"
                >
                  <img
                    src={
                      createClient().storage.from("brand-logos").getPublicUrl(path).data.publicUrl
                    }
                    alt="Brand context"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setExistingContextImages((prev) => prev.filter((p) => p !== path))
                    }
                    aria-label="Remove image"
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-foreground/70 text-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {contextImageFiles.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted"
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Brand context"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setContextImageFiles((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Remove image"
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-foreground/70 text-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {totalContextImages < MAX_CONTEXT_IMAGES && (
                <label
                  htmlFor="bp-context-images"
                  className="flex h-14 w-14 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <ImageUp className="h-5 w-5" />
                </label>
              )}
              <input
                id="bp-context-images"
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.webp"
                className="sr-only"
                onChange={(e) => {
                  handleContextImagesAdded(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
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
