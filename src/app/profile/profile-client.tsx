"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Palette, Pencil, Plus, Star, Trash2, User, Zap } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function PersonalInfoSection({
  profile,
  email,
  onSaved,
}: {
  profile: Profile | null;
  email: string;
  onSaved: (profile: Profile) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setUsername(profile?.username ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }, [profile]);

  const dirty =
    profile &&
    (fullName !== (profile.full_name ?? "") ||
      username !== profile.username ||
      avatarUrl !== (profile.avatar_url ?? ""));

  const handleSave = async () => {
    if (!username.trim()) {
      setUsernameError("Username can't be empty");
      return;
    }
    setUsernameError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          username: username.trim(),
          avatar_url: avatarUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) setUsernameError(data.error ?? "That username is already taken");
        else toast.error("Could not save your info");
        return;
      }
      onSaved(data.profile);
      toast.success("Profile updated");
    } finally {
      setSaving(false);
    }
  };

  const initials = (profile?.full_name || profile?.username || "•").slice(0, 2).toUpperCase();

  return (
    <div className="rounded-3xl border bg-card p-6 shadow-card">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold">Personal Info</h2>
          <p className="text-xs text-muted-foreground">Your name, username, and avatar</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border object-cover"
          />
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="profile-avatar">Avatar URL</Label>
          <Input
            id="profile-avatar"
            type="url"
            placeholder="https://…/photo.jpg"
            className="h-10 rounded-xl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Full Name</Label>
          <Input
            id="profile-name"
            placeholder="Jane Doe"
            className="h-11 rounded-xl"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="profile-username">Username</Label>
          <Input
            id="profile-username"
            placeholder="janedoe"
            className={`h-11 rounded-xl ${usernameError ? "border-destructive" : ""}`}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameError(null);
            }}
          />
          {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            disabled
            className="h-11 rounded-xl text-muted-foreground"
            value={email}
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          className="rounded-xl font-semibold"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
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

export function ProfilePageClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data.profile);
        setEmail(data.email ?? data.profile?.email ?? "");
      })
      .catch(() => toast.error("Could not load your profile"));
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-3xl space-y-4">
        <PersonalInfoSection profile={profile} email={email} onSaved={setProfile} />

        <BrandProfilesSection />

        <Section
          icon={Zap}
          title="Credits"
          desc={`${profile?.credits_balance ?? "…"} remaining · ${profile?.plan ?? "starter"} plan`}
        >
          <Button variant="outline" className="rounded-xl font-semibold" asChild>
            <a href="/credits">View usage</a>
          </Button>
        </Section>

        <Section icon={LogOut} title="Account" desc="Sign out of Repurpose AI on this device">
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
