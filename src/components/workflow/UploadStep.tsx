import { CloudUpload, FileVideo, Link2, Palette, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function UploadStep({ onContinue }: { onContinue: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const acceptFile = (name?: string) => {
    setFileName(name ?? "competitor-ad.mp4");
    toast.success("Video added", { description: name ?? "competitor-ad.mp4" });
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
          acceptFile(e.dataTransfer.files[0]?.name);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-card px-6 py-14 text-center transition-all duration-300 sm:py-20",
          dragging ? "border-primary bg-accent shadow-glow" : "border-border shadow-card",
        )}
      >
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent animate-float">
          {fileName ? (
            <FileVideo className="h-7 w-7 text-primary" />
          ) : (
            <CloudUpload className="h-7 w-7 text-primary" />
          )}
        </div>
        <h2 className="mt-6 text-lg font-bold tracking-tight sm:text-xl">
          {fileName ?? "Drag & drop your competitor's ad"}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {fileName ? "Ready for AI analysis" : "Supports MP4, MOV and WebM up to 500 MB"}
        </p>
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
          <label>
            <input
              type="file"
              accept=".mp4,.mov,.webm"
              className="sr-only"
              onChange={(e) => acceptFile(e.target.files?.[0]?.name)}
            />
            <Button asChild className="btn-glow rounded-xl font-semibold">
              <span className="cursor-pointer">
                <Upload className="h-4 w-4" />
                Browse Files
              </span>
            </Button>
          </label>
          <Button
            variant="outline"
            className="rounded-xl font-semibold"
            onClick={() => toast.info("Paste Video URL is coming soon")}
          >
            <Link2 className="h-4 w-4" />
            Paste Video URL
          </Button>
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
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service">Service / Product</Label>
            <Input id="service" placeholder="Premium D2C perfume" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audience">Target Audience</Label>
            <Input
              id="audience"
              placeholder="Women 24–38, urban, aspirational"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tone</Label>
            <Select>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="luxury">Luxury & minimal</SelectItem>
                <SelectItem value="playful">Playful & bold</SelectItem>
                <SelectItem value="trust">Trustworthy & expert</SelectItem>
                <SelectItem value="cinematic">Cinematic & emotional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Brand Description</Label>
            <Textarea
              id="description"
              placeholder="What makes your brand different?"
              className="min-h-24 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="colors">Brand Colors</Label>
            <Input id="colors" placeholder="#2563EB, #F8FAFC" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cta">CTA</Label>
            <Input id="cta" placeholder="Find your signature scent" className="h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Logo Upload</Label>
            <label className="flex h-24 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={() => toast.success("Logo uploaded")}
              />
              <Upload className="h-4 w-4" />
              Drop your logo or click to browse
            </label>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            size="lg"
            className="btn-glow h-12 rounded-xl px-8 font-semibold"
            onClick={onContinue}
          >
            Start AI Analysis
          </Button>
        </div>
      </div>
    </div>
  );
}
