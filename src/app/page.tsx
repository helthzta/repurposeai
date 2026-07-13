import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clapperboard,
  Layers,
  PenLine,
  Play,
  ScanEye,
  Sparkles,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Repurpose AI — Turn Any Ad Into Your AI Commercial",
  description:
    "Upload any advertisement. Our AI understands the strategy, rewrites it for your brand, and generates a brand-new cinematic commercial in minutes.",
};

const features = [
  {
    icon: ScanEye,
    title: "AI Video Analysis",
    desc: "Deconstructs any ad into hook, structure, emotion, and strategy in seconds.",
  },
  {
    icon: PenLine,
    title: "AI Script Repurposing",
    desc: "Rewrites the winning formula for your brand voice, offer, and audience.",
  },
  {
    icon: Timer,
    title: "15–30 Second Generation",
    desc: "Cinematic commercials rendered in minutes — ready for every platform.",
  },
  {
    icon: Layers,
    title: "Multi AI Provider Ready",
    desc: "Seedance, Higgsfield, and future providers — switch with one click.",
  },
];

const particles = [
  { top: "12%", left: "8%", size: 8, delay: "0s" },
  { top: "24%", left: "82%", size: 6, delay: "1.2s" },
  { top: "58%", left: "12%", size: 10, delay: "2.1s" },
  { top: "70%", left: "88%", size: 7, delay: "0.6s" },
  { top: "38%", left: "94%", size: 5, delay: "1.8s" },
  { top: "82%", left: "42%", size: 6, delay: "2.6s" },
  { top: "16%", left: "46%", size: 5, delay: "3.2s" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-40 glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-primary shadow-card">
              <Clapperboard className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="truncate text-[15px] font-bold tracking-tight">Repurpose AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="btn-glow rounded-xl">
              <Link href="/dashboard">
                Start Repurposing
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero animate-gradient-pan pt-36 pb-24 sm:pt-44 sm:pb-32">
        {/* floating blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary-glow/15 blur-3xl animate-float" />
        {/* particles */}
        {particles.map((p, i) => (
          <span
            key={i}
            className="pointer-events-none absolute rounded-full bg-primary/30 animate-float"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
            }}
          />
        ))}

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="animate-fade-up mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-4 py-1.5 text-xs font-semibold text-primary shadow-card backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Video Repurposing
          </div>
          <h1
            className="animate-fade-up text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Turn Any Competitor Ad Into{" "}
            <span className="gradient-text">Your Own AI Commercial</span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            Upload any advertisement. Our AI understands the strategy, rewrites it for your brand,
            and generates a brand-new cinematic commercial in minutes.
          </p>
          <div
            className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <Button
              asChild
              size="lg"
              className="btn-glow h-13 rounded-2xl px-8 text-base font-semibold"
            >
              <Link href="/dashboard">
                Start Repurposing
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 rounded-2xl bg-card/70 px-8 text-base font-semibold backdrop-blur hover:bg-card"
            >
              <Link href="/dashboard">
                <Play className="h-4.5 w-4.5" />
                Watch Demo
              </Link>
            </Button>
          </div>

          {/* glass workflow strip */}
          <div
            className="animate-fade-up mx-auto mt-16 max-w-3xl rounded-3xl glass p-4 shadow-card sm:p-5"
            style={{ animationDelay: "320ms" }}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["Upload Video", "AI Analysis", "Choose Script", "Generate"].map((step, i) => (
                <div
                  key={step}
                  className="flex items-center gap-2.5 rounded-2xl bg-card/80 px-3.5 py-3 text-left shadow-card"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg gradient-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 truncate text-xs font-semibold">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Everything between their ad and yours
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground sm:text-base">
          A single workflow that takes you from a competitor's video to a finished commercial.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="hover-lift rounded-2xl border bg-card p-6 shadow-card">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-5 text-[15px] font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl gradient-primary px-6 py-16 text-center shadow-lift sm:px-12">
          <div className="pointer-events-none absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
          <h2 className="text-2xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl">
            Your next commercial is one upload away
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-primary-foreground/80 sm:text-base">
            Join teams shipping cinematic AI commercials in minutes, not weeks.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="mt-8 h-13 rounded-2xl px-8 text-base font-semibold hover-lift"
          >
            <Link href="/dashboard">
              Start Repurposing
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-md gradient-primary">
              <Clapperboard className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Repurpose AI</span>
          </div>
          <p>© 2026 Repurpose AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
