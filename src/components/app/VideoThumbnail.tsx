"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Captures a still frame from a video URL and renders it as an <img> — avoids
 * the blank/black-frame flash of a bare <video> with no poster. Falls back to
 * the raw <video> element (still shows a frame once the browser decodes one,
 * just not deterministically) if frame capture is blocked, e.g. a tainted
 * canvas from a storage response without CORS headers.
 */
export function VideoThumbnail({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frame, setFrame] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setFrame(null);
    setBlocked(false);
  }, [src]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const duration = video.duration;
    video.currentTime = Number.isFinite(duration) ? Math.min(2, duration * 0.25) : 0;
  };

  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setFrame(canvas.toDataURL("image/jpeg", 0.82));
    } catch {
      // ponytail: tainted-canvas fallback (missing CORS headers) — keep showing the
      // plain <video> below rather than an error; a captured thumbnail is a nicety.
      setBlocked(true);
    }
  };

  if (frame) {
    return <img src={frame} alt="" className={className} />;
  }

  return (
    <video
      ref={videoRef}
      src={src}
      crossOrigin={blocked ? undefined : "anonymous"}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={handleLoadedMetadata}
      onSeeked={handleSeeked}
      className={className}
    />
  );
}
