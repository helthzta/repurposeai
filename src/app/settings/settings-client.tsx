"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Globe, Palette, Pencil, Plus, Star, Trash2, User, Zap } from "lucide-react";
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
import { BrandProfileDialog } from "@/components/brand/BrandProfileDialog";
import { createClient } from "@/lib/supabase/client";
import type { BrandProfile, Profile } from "@/lib/types";

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

function BrandProfilesSection() {
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BrandProfile | null>(null);

  const load = () => {
    fetch("/api/brand-profiles")
      .then((res) => res.json())
      .then((data) => setProfiles(data.brandProfiles ?? []))
      .catch(() => toast.error("Could not load brand profiles"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (profile: BrandProfile) => {
    setEditing(profile);
    setDialogOpen(true);
  };

  const handleSaved = (saved: BrandProfile) => {
    setProfiles((prev) => {
      const others = saved.is_default ? prev.map((p) => ({ ...p, is_default: false })) : prev;
      const exists = others.some((p) => p.id === saved.id);
      return exists ? others.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...others];
    });
  };

  const handleDelete = async (profile: BrandProfile) => {
    if (!confirm(`Delete "${profile.label}"? Projects using it keep their generated videos.`)) {
      return;
    }
    const res = await fetch(`/api/brand-profiles/${profile.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete brand profile");
      return;
    }
    toast.success("Brand profile deleted");
    load();
  };

  return (
    <div className="rounded-3xl border bg-card p-6 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold">Brand Profiles</h2>
            <p className="text-xs text-muted-foreground">
              Reusable brand details, picked per commercial
            </p>
          </div>
        </div>
        <Button size="sm" className="rounded-xl font-semibold" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          Add brand
        </Button>
      </div>

      {!loading && profiles.length === 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          No brand profiles yet — add one to skip re-entering brand details every time.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                {profile.label}
                {profile.is_default && (
                  <Star className="h-3 w-3 shrink-0 fill-primary text-primary" />
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {profile.brand_name ?? "No brand name set"}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => openEdit(profile)}
                aria-label={`Edit ${profile.label}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                onClick={() => handleDelete(profile)}
                aria-label={`Delete ${profile.label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <BrandProfileDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}

export function SettingsPageClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.profile);
      })
      .catch(() => toast.error("Could not load settings"));
  }, []);

  const patch = async (body: Partial<Profile>) => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error("Could not save setting");
      return;
    }
    setProfile(data.profile);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-3xl space-y-4">
        <Section
          icon={Palette}
          title="Theme"
          desc={profile?.theme === "system" ? "Follows system" : "Light mode is active"}
        >
          <Select
            value={profile?.theme ?? "light"}
            onValueChange={(theme) => patch({ theme: theme as Profile["theme"] })}
          >
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
          <Select value={profile?.locale ?? "en"} onValueChange={(locale) => patch({ locale })}>
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

        <Section
          icon={Zap}
          title="Credits"
          desc={`${profile?.credits_balance ?? "…"} remaining · ${profile?.plan ?? "starter"} plan`}
        >
          <Button variant="outline" className="rounded-xl font-semibold" asChild>
            <a href="/credits">View usage</a>
          </Button>
        </Section>

        <BrandProfilesSection />

        <Section icon={Bell} title="Notifications" desc="Email me when generations finish">
          <Switch
            checked={profile?.notify_on_completion ?? true}
            onCheckedChange={(v) => patch({ notify_on_completion: v })}
          />
        </Section>

        <Section icon={User} title="Account" desc={profile?.username ? `@${profile.username}` : ""}>
          <Button
            variant="outline"
            className="rounded-xl font-semibold text-destructive hover:text-destructive"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </Section>
      </div>
    </AppShell>
  );
}
