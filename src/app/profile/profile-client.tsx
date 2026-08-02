"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Loader2,
  LogOut,
  Palette,
  Pencil,
  Plus,
  Star,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandProfileDialog } from "@/components/brand/BrandProfileDialog";
import { useProfile, useUpdateProfileCache } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
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

/** Drag-and-drop (or click-to-browse) profile photo upload — saves immediately on drop. */
function AvatarDropzone({
  profile,
  onUploaded,
}: {
  profile: Profile | null;
  onUploaded: (profile: Profile) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "avatar", filename: file.name }),
      });
      if (!signRes.ok) throw new Error("Could not prepare upload");
      const { bucket, path, token } = await signRes.json();

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(path, token, file);
      if (uploadError) throw uploadError;

      const confirmRes = await fetch("/api/uploads/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "avatar", path, filename: file.name }),
      });
      if (!confirmRes.ok) throw new Error("Could not save your photo");
      const { profile: updated } = await confirmRes.json();
      onUploaded(updated);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error("Couldn't upload photo", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  };

  const initials = (profile?.full_name || profile?.username || "•").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "group relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-dashed transition-colors",
          dragging ? "border-primary bg-accent" : "border-border",
        )}
      >
        <label htmlFor="profile-avatar-file" className="absolute inset-0 block cursor-pointer">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center gradient-primary text-sm font-bold text-primary-foreground">
              {initials}
            </div>
          )}
          <div className="absolute inset-0 grid place-items-center bg-foreground/0 text-transparent transition-colors group-hover:bg-foreground/40 group-hover:text-background">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </div>
        </label>
        <input
          id="profile-avatar-file"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">Profile photo</p>
        <p className="text-xs text-muted-foreground">Drag and drop an image, or click to browse.</p>
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
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setUsername(profile?.username ?? "");
  }, [profile]);

  const dirty =
    profile && (fullName !== (profile.full_name ?? "") || username !== profile.username);

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

      <div className="mt-5">
        <AvatarDropzone profile={profile} onUploaded={onSaved} />
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
  const { data } = useProfile();
  const updateProfileCache = useUpdateProfileCache();
  const profile = data?.profile ?? null;
  const email = data?.email ?? profile?.email ?? "";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-3xl space-y-4">
        <PersonalInfoSection profile={profile} email={email} onSaved={updateProfileCache} />

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
