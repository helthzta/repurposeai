import { Clock, Copy, Download, Layers, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { historyProjects } from "@/lib/mock-data";
import thumbPerfume from "@/assets/thumb-perfume.jpg";
import thumbSneaker from "@/assets/thumb-sneaker.jpg";
import thumbSkincare from "@/assets/thumb-skincare.jpg";

const thumbs = {
  perfume: thumbPerfume,
  sneaker: thumbSneaker,
  skincare: thumbSkincare,
} as const;

export function ProjectGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {historyProjects.map((project, i) => (
        <div
          key={project.id}
          className="hover-lift animate-fade-up group overflow-hidden rounded-2xl border bg-card shadow-card"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="relative aspect-video overflow-hidden">
            <img
              src={thumbs[project.thumb]}
              alt={`${project.name} commercial thumbnail`}
              width={1152}
              height={768}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 grid place-items-center bg-foreground/0 opacity-0 transition-all duration-300 group-hover:bg-foreground/20 group-hover:opacity-100">
              <span className="grid h-12 w-12 place-items-center rounded-full glass">
                <Play className="h-5 w-5 text-primary" fill="currentColor" />
              </span>
            </div>
            <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-foreground/70 px-2.5 py-1 text-[11px] font-semibold text-background backdrop-blur">
              <Clock className="h-3 w-3" />
              {project.duration}
            </span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold">{project.name}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {project.date}
                  <span className="text-border">·</span>
                  <Layers className="h-3 w-3" />
                  {project.provider}
                </p>
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs" onClick={() => toast.success("Download started")}>
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" aria-label="Duplicate" onClick={() => toast.success("Project duplicated")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                aria-label="Delete"
                onClick={() => toast.success("Project deleted")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
