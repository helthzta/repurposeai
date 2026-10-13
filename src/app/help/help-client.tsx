"use client";

import Link from "next/link";
import { Copyright, FileText, MessageCircle, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const legalLinks = [
  { href: "/terms", label: "Terms of Condition", icon: FileText },
  { href: "/privacy", label: "Privacy Policy", icon: ShieldCheck },
  { href: "/copyright", label: "Copyright Policy", icon: Copyright },
];

const faqs = [
  {
    q: "What video formats can I upload?",
    a: "MP4, MOV and WebM up to 500 MB. Vertical, horizontal and square videos are all supported.",
  },
  {
    q: "Is it legal to repurpose viral ads?",
    a: "Adiy AI never copies footage. It analyzes the marketing strategy and generates a completely original commercial for your brand — the output is 100% new content.",
  },
  {
    q: "How long does generation take?",
    a: "Most 15–30 second commercials render in 2–4 minutes depending on provider and quality settings.",
  },
  {
    q: "Which AI video providers are supported?",
    a: "Seedance today, with Higgsfield and more providers coming soon.",
  },
  {
    q: "How do credits work?",
    a: "Each generation uses credits based on length and quality — a 15s HD 1080p video uses 9 credits, a 30s HD 1080p video uses 42. Credits reset monthly with your plan.",
  },
];

export function HelpPageClient() {
  return (
    <AppShell title="Help">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-lg font-extrabold tracking-tight">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-4">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-semibold">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-8">
          <h2 className="text-lg font-extrabold tracking-tight">Legal</h2>
          <div className="mt-4 divide-y divide-border">
            {legalLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 py-3 text-sm font-semibold text-foreground transition-colors hover:text-primary"
              >
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6 text-center shadow-card sm:p-8">
          <h3 className="text-sm font-bold">Still need help?</h3>
          <p className="mt-1 text-sm text-muted-foreground">Our team replies within a few hours.</p>
          <Button asChild className="btn-glow mt-4 rounded-xl font-semibold">
            <Link href="/contact">
              <MessageCircle className="h-4 w-4" />
              Contact support
            </Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
