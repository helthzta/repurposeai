import { Camera, Clock, Layers, MonitorPlay, RectangleVertical, Sparkles, Square, RectangleHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function OptionGroup<T extends string>({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  disabledValues = [],
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  disabledValues?: T[];
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-bold">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt) => {
          const disabled = disabledValues.includes(opt.value);
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                active
                  ? "border-primary bg-accent text-accent-foreground shadow-glow"
                  : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                disabled && "cursor-not-allowed opacity-45 hover:border-border hover:text-muted-foreground",
              )}
            >
              {opt.label}
              {opt.hint && <span className="ml-1.5 text-[11px] font-medium opacity-70">{opt.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GenerateStep({ onGenerate }: { onGenerate: () => void }) {
  const [provider, setProvider] = useState("seedance");
  const [length, setLength] = useState("15");
  const [aspect, setAspect] = useState("9:16");
  const [quality, setQuality] = useState("high");
  const [style, setStyle] = useState("commercial");

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-10">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl gradient-primary shadow-card">
            <MonitorPlay className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">Generation Settings</h2>
            <p className="text-xs text-muted-foreground">Fine-tune how your commercial is rendered</p>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <OptionGroup
            label="Select Provider"
            icon={Layers}
            value={provider}
            onChange={setProvider}
            options={[
              { value: "seedance", label: "Seedance" },
              { value: "higgsfield", label: "Higgsfield" },
              { value: "future", label: "Future Provider", hint: "soon" },
            ]}
            disabledValues={["future"]}
          />
          <OptionGroup
            label="Video Length"
            icon={Clock}
            value={length}
            onChange={setLength}
            options={[
              { value: "15", label: "15 seconds" },
              { value: "30", label: "30 seconds" },
              { value: "custom", label: "Custom" },
            ]}
          />
          <OptionGroup
            label="Aspect Ratio"
            icon={RectangleVertical}
            value={aspect}
            onChange={setAspect}
            options={[
              { value: "9:16", label: "9:16" },
              { value: "16:9", label: "16:9" },
              { value: "1:1", label: "1:1" },
            ]}
          />
          <OptionGroup
            label="Visual Quality"
            icon={Sparkles}
            value={quality}
            onChange={setQuality}
            options={[
              { value: "standard", label: "Standard" },
              { value: "high", label: "High" },
              { value: "ultra", label: "Ultra" },
            ]}
          />
          <OptionGroup
            label="Camera Style"
            icon={Camera}
            value={style}
            onChange={setStyle}
            options={[
              { value: "commercial", label: "Commercial" },
              { value: "luxury", label: "Luxury" },
              { value: "cinematic", label: "Cinematic" },
              { value: "product", label: "Product Focus" },
              { value: "ugc", label: "UGC" },
            ]}
          />
        </div>

        <Button size="lg" className="btn-glow mt-10 h-14 w-full rounded-2xl text-base font-bold" onClick={onGenerate}>
          <Sparkles className="h-5 w-5" />
          Generate Commercial
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Uses 20 credits · Estimated 2–4 minutes</p>
      </div>
    </div>
  );
}
