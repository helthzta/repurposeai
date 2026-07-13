"use client";

import type { ComponentType, ReactNode } from "react";
import { Bell, CreditCard, Globe, KeyRound, Palette, User, Zap } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-card">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold">{title}</h2>
            <p className="truncate text-xs text-muted-foreground">{desc}</p>
          </div>
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    </div>
  );
}

export function SettingsPageClient() {
  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-3xl space-y-4">
        <Section icon={Palette} title="Theme" desc="Light mode is active">
          <Select defaultValue="light">
            <SelectTrigger className="w-32 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </Section>

        <Section icon={Globe} title="Language" desc="Interface language">
          <Select defaultValue="en">
            <SelectTrigger className="w-32 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </Section>

        <Section icon={KeyRound} title="API Keys" desc="1 active key">
          <Button
            variant="outline"
            className="rounded-xl font-semibold"
            onClick={() => toast.success("API key copied")}
          >
            Manage
          </Button>
        </Section>

        <Section icon={Zap} title="Credits" desc="240 remaining · Pro plan">
          <Button
            variant="outline"
            className="rounded-xl font-semibold"
            onClick={() => toast.info("Redirecting to credits")}
          >
            View usage
          </Button>
        </Section>

        <Section icon={CreditCard} title="Billing" desc="Visa ending 4242 · next invoice Jul 18">
          <Button
            variant="outline"
            className="rounded-xl font-semibold"
            onClick={() => toast.info("Billing portal opening")}
          >
            Manage
          </Button>
        </Section>

        <Section icon={Bell} title="Notifications" desc="Email me when generations finish">
          <Switch
            defaultChecked
            onCheckedChange={(v) => toast.success(v ? "Notifications on" : "Notifications off")}
          />
        </Section>

        <Section icon={User} title="Account" desc="alex@lumiere.co">
          <Button
            variant="outline"
            className="rounded-xl font-semibold text-destructive hover:text-destructive"
            onClick={() => toast.info("Signed out")}
          >
            Sign out
          </Button>
        </Section>
      </div>
    </AppShell>
  );
}
