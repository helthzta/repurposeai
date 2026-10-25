import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = ["Upload", "AI Analysis", "Ideas", "Generate", "Result"];

export function StepProgress({ current }: { current: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={step} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-all duration-300 sm:h-9 sm:w-9",
                    done && "bg-success text-success-foreground",
                    active && "gradient-primary text-primary-foreground shadow-glow",
                    !done && !active && "border bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-sm font-semibold sm:block",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="mx-3 h-0.5 flex-1 overflow-hidden rounded-full bg-muted sm:mx-4">
                  <div
                    className="h-full rounded-full gradient-primary transition-all duration-500"
                    style={{ width: done ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
