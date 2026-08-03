"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Lets a user pitch their own concept instead of picking one of the 3 AI ideas — the submitted
 * text becomes the idea's "pitch" and is sent through the exact same /api/scripts/generate call
 * a picked idea would use, so it produces a script identically. */
export function CustomIdeaDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (pitch: string) => void;
  submitting: boolean;
}) {
  const [pitch, setPitch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!pitch.trim()) {
      setError("Describe your idea before writing the script");
      return;
    }
    setError(null);
    onSubmit(pitch.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add your own idea</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="custom-idea">Your idea</Label>
          <Textarea
            id="custom-idea"
            placeholder="Describe the commercial concept you want — the angle, the hook, anything specific you want in it…"
            className={cn("min-h-32 rounded-xl", error && "border-destructive")}
            value={pitch}
            onChange={(e) => {
              setPitch(e.target.value);
              if (error) setError(null);
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            className="btn-glow rounded-xl font-semibold"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Write Full Script
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
