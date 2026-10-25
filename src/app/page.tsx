import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clapperboard, Layers, PenLine, Play, ScanEye, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoReel, type DemoAd } from "@/components/landing/DemoReel";
import { PricingTable } from "@/components/pricing/PricingTable";
import { formatUsd, getPricing, monthlyPriceCents, type Pricing } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Adiy AI — Turn Any Viral Ad Into Your Own AI Commercial",
  description:
    "Upload any viral ad. Our AI understands the strategy, rewrites it for your brand, and generates a brand-new cinematic commercial in minutes.",
};

// Add a demo: run scripts/encode-demo.sh on the file, then append an entry here.
const demoAds: DemoAd[] = [
  {
    title: "Downhill, close up",
    caption: "15s · 16:9 · sports gear",
    src: "/demos/demo-1.mp4",
    poster: "/demos/demo-1.jpg",
    aspect: "16:9",
  },
  {
    title: "Ridge line",
    caption: "15s · 16:9 · outdoor brand",
    src: "/demos/demo-2.mp4",
    poster: "/demos/demo-2.jpg",
    aspect: "16:9",
  },
  {
    title: "Night rider",
    caption: "15s · 9:16 · Reels & TikTok",
    src: "/demos/demo-3.mp4",
    poster: "/demos/demo-3.jpg",
    aspect: "9:16",
  },
];

const steps = [
  {
    icon: ScanEye,
    title: "Upload a viral ad",
    desc: "AI breaks it down into hook, structure, emotion and why it worked.",
  },
  {
    icon: PenLine,
    title: "Pick an idea",
    desc: "Three repurposed concepts for your brand — or recreate the original shot for shot.",
  },
  {
    icon: Timer,
    title: "Generate",
    desc: "A cinematic 15s or 30s commercial in 720p or HD 1080p, in minutes.",
  },
  {
    icon: Layers,
    title: "Ship everywhere",
    desc: "9:16 for Reels and TikTok, 16:9 for YouTube. Download and post.",
  },
];

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ctaHref = user ? "/dashboard" : "/signup";

  let pricing: Pricing | null = null;
  try {
    pricing = await getPricing(supabase);
  } catch {
    // Rendered as a "contact us" fallback below rather than failing the whole landing page.
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-40 glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-primary shadow-card">
              <Clapperboard className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="truncate text-[15px] font-bold tracking-tight">Adiy AI</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <Link href="#demos" className="transition-colors hover:text-foreground">
              Demos
            </Link>
            <Link href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </Link>
            <Link href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild className="btn-glow rounded-xl">
                <Link href="/dashboard">
                  Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden sm:inline-flex">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="btn-glow rounded-xl">
                  <Link href="/signup">
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero pt-36 pb-20 sm:pt-44 sm:pb-28">
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-primary-glow/15 blur-3xl animate-float" />

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="animate-fade-up mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-4 py-1.5 text-xs font-semibold text-primary shadow-card backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-soft" />
            AI commercials from the ads that already work
          </p>
          <h1
            className="animate-fade-up text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            Turn any viral ad into{" "}
            <span className="font-display font-normal italic tracking-normal text-primary">
              your own
            </span>{" "}
            AI commercial
          </h1>
          <p
            className="animate-fade-up mx-auto mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            Upload any viral ad. Adiy reads the strategy, rewrites it for your brand, and renders a
            brand-new cinematic commercial in minutes.
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
              <Link href={ctaHref}>
                {user ? "Open dashboard" : "Create your account"}
                <ArrowRight className="h-4.5 w-4.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 rounded-2xl bg-card/70 px-8 text-base font-semibold backdrop-blur hover:bg-card"
            >
              <Link href="#demos">
                <Play className="h-4.5 w-4.5" />
                Watch the demos
              </Link>
            </Button>
          </div>
          {pricing && (
            <p
              className="animate-fade-up mt-5 text-xs text-muted-foreground"
              style={{ animationDelay: "300ms" }}
            >
              Plans from {formatUsd(Math.min(...pricing.plans.map(monthlyPriceCents)))}/month ·
              cancel anytime
            </p>
          )}
        </div>
      </section>

      {/* Demo reel — the dark "screening room" band */}
      <section
        id="demos"
        className="scroll-mt-16 bg-[oklch(0.16_0.03_264)] py-20 text-white sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
                Now showing
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
                Made with <span className="font-display font-normal italic">Adiy</span>
              </h2>
            </div>
            <p className="max-w-sm text-sm text-white/55">
              Demo commercials from Adiy AI. They play muted — tap the speaker for sound.
            </p>
          </div>
          <div className="mt-12">
            <DemoReel demos={demoAds} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28"
      >
        <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
          From viral ad to{" "}
          <span className="font-display font-normal italic text-primary">yours</span>, in four steps
        </h2>
        <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="hover-lift rounded-3xl border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="font-display text-3xl italic text-muted-foreground/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-5 text-[15px] font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 border-t bg-muted/40 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            Simple plans,{" "}
            <span className="font-display font-normal italic text-primary">honest</span> credits
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground sm:text-base">
            Every video has a fixed credit price, so you always know what a month buys.
          </p>
          <div className="mt-10">
            {pricing ? (
              <PricingTable
                plans={pricing.plans}
                rates={pricing.rates}
                ctaHref={user ? "/credits" : "/signup"}
              />
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Pricing is temporarily unavailable —{" "}
                <Link href="/contact" className="font-semibold text-primary hover:underline">
                  contact us
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <div className="relative overflow-hidden rounded-3xl gradient-primary px-6 py-16 text-center shadow-lift sm:px-12">
          <div className="pointer-events-none absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-primary-foreground/10 blur-3xl" />
          <h2 className="text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-5xl">
            Your next commercial is{" "}
            <span className="font-display font-normal italic">one upload</span> away
          </h2>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="mt-9 h-13 rounded-2xl px-8 text-base font-semibold hover-lift"
          >
            <Link href={ctaHref}>
              {user ? "Open dashboard" : "Create your account"}
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-md gradient-primary">
              <Clapperboard className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Adiy AI</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-medium">
            <Link href="#pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/contact" className="hover:text-foreground">
              Contact
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/copyright" className="hover:text-foreground">
              Copyright
            </Link>
          </nav>
          <p className="text-xs">
            © {new Date().getFullYear()} Adiy AI ·{" "}
            {/* Discreet entry to the separate admin console (own login, not a user account). */}
            <Link href="/admin/login" className="text-muted-foreground/60 hover:text-foreground">
              Admin
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
