"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DemoAd {
  title: string;
  caption: string;
  /** Files live in public/demos — encode with faststart (see scripts/encode-demo.sh). */
  src: string;
  poster: string;
  aspect: "9:16" | "16:9";
}

/**
 * One demo ad: poster until it scrolls into view, then muted autoplay; pauses off-screen.
 * preload="none" means nothing but the poster downloads until the card is actually seen.
 * Visitors who prefer reduced motion get the poster plus native controls instead of autoplay.
 */
function DemoVideo({ demo, index }: { demo: DemoAd; index: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReducedMotion(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.5 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <figure
      className={cn(
        "group relative overflow-hidden rounded-[1.75rem] bg-black ring-1 ring-white/10",
        demo.aspect === "9:16" ? "aspect-[9/16]" : "aspect-video",
      )}
    >
      <video
        ref={ref}
        src={demo.src}
        poster={demo.poster}
        muted={muted}
        loop
        playsInline
        preload="none"
        controls={reducedMotion}
        aria-label={demo.title}
        className="h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-5 pt-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
          Reel {String(index + 1).padStart(2, "0")}
        </p>
        <figcaption className="mt-1 text-base font-semibold text-white">{demo.title}</figcaption>
        <p className="text-xs text-white/60">{demo.caption}</p>
      </div>
      {!reducedMotion && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}
    </figure>
  );
}

/**
 * Landscape reels span two columns and stack; a portrait reel stands beside them. Add more ads by
 * appending to the list on the landing page — the grid flows them in order.
 */
export function DemoReel({ demos }: { demos: DemoAd[] }) {
  const landscape = demos.filter((d) => d.aspect === "16:9");
  const portrait = demos.filter((d) => d.aspect === "9:16");
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-start">
      <div className="grid gap-5">
        {landscape.map((d) => (
          <DemoVideo key={d.src} demo={d} index={demos.indexOf(d)} />
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-1">
        {portrait.map((d) => (
          <DemoVideo key={d.src} demo={d} index={demos.indexOf(d)} />
        ))}
      </div>
    </div>
  );
}
