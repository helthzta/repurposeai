"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clapperboard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "oauth_failed") {
      toast.error("Google sign-in failed", { description: "Please try again." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const username = String(form.get("username") ?? "").trim();

    const supabase = createClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.includes("Email not confirmed")) {
        toast.error("Please verify your email address to sign in.");
        setLoading(false);
        return;
      }

      if (!username) {
        toast.error("Choose a username to create your account");
        setLoading(false);
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (signUpError) {
        const description = signUpError.message.includes("profiles_username_key")
          ? "That username is already taken — try another."
          : (signUpError.message ?? signInError.message);
        toast.error("Couldn't sign in", { description });
        setLoading(false);
        return;
      }

      if (!signUpData.session) {
        // Supabase's documented signal for "this email is already registered": signUp on an
        // existing address succeeds with no error, but returns an empty identities array.
        // Without this check, a wrong password on an existing account looks identical to a
        // brand-new signup and shows the wrong message ("check your email to verify").
        const alreadyRegistered = (signUpData.user?.identities?.length ?? 0) === 0;
        if (alreadyRegistered) {
          toast.error("Incorrect password", {
            description: "That email already has an account — double-check your password.",
          });
        } else {
          toast.success("Check your email!", {
            description: "We sent you a link to verify your account.",
          });
        }
        setLoading(false);
        return;
      }

      toast.success("Account created — signing you in");
    }

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden gradient-hero animate-gradient-pan px-4">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary-glow/10 blur-3xl animate-float" />

      <div className="animate-fade-up relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-primary shadow-card">
            <Clapperboard className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">Repurpose AI</span>
        </Link>

        <div className="rounded-3xl border bg-card p-8 shadow-card">
          <h1 className="text-center text-xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">
            Sign in to continue repurposing
          </p>

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
                autoComplete="username"
                placeholder="janedoe"
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Only needed the first time, to create your account.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
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
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            No account yet? Just sign in above — we&apos;ll create one automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
