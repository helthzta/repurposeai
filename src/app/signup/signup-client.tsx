"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { createClient } from "@/lib/supabase/client";

export function SignupPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username")).trim();
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (error) {
      const description = error.message.includes("profiles_username_key")
        ? "That username is already taken — try another."
        : error.message;
      toast.error("Couldn't create account", { description });
      setLoading(false);
      return;
    }

    if (!data.session) {
      // Supabase's documented signal for "this email is already registered": signUp on an
      // existing address succeeds with no error, but returns an empty identities array.
      const alreadyRegistered = (data.user?.identities?.length ?? 0) === 0;
      if (alreadyRegistered) {
        toast.error("That email already has an account", {
          description: "Try signing in instead.",
        });
      } else {
        toast.success("Check your email!", {
          description: "We sent you a link to verify your account.",
        });
      }
      setLoading(false);
      return;
    }

    toast.success("Account created");
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start turning ads into your own AI commercials"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="mt-7 h-11 w-full rounded-xl font-semibold"
        onClick={handleGoogle}
        type="button"
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            placeholder="janedoe"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-11 rounded-xl"
          />
        </div>
        <Button
          type="submit"
          className="btn-glow h-11 w-full rounded-xl font-semibold"
          disabled={loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
