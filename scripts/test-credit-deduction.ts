/**
 * Credit deduction through the real HTTP route (POST /api/generations) as a signed-in user, with
 * the video provider mocked — run against a dev server started with MOCK_PROVIDERS=true:
 *
 *   MOCK_PROVIDERS=true npx next dev -p 3100
 *   BASE_URL=http://localhost:3100 npx tsx scripts/test-credit-deduction.ts
 *
 * Checks each duration/quality charges its credit_rates row (5 / 35 / 40 / 42), that removed
 * options (1:1, 480p) are rejected, that an unaffordable render returns 402 without charging, and
 * that a failed render is refunded. Creates a disposable user and deletes it afterwards.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && process.env[m[1]] === undefined)
      process.env[m[1]] = (m[2] ?? "").replace(/^["']|["']$/g, "");
  }
}
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const db = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

let passed = 0;
async function step(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

async function main() {
  const email = `credit-test-${Date.now()}@example.com`;
  const password = `T3st-${crypto.randomUUID()}`;
  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const userId = created.user.id;

  try {
    // Session cookie exactly as @supabase/ssr stores it (see learned-rules R-043).
    const anon = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
    const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
    const ref = new URL(URL_).hostname.split(".")[0];
    const cookie = `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(signIn.session)).toString("base64url")}`;

    // Minimal project → brand → analysis → 15s and 30s scripts, written directly.
    const { data: brand } = await db
      .from("brand_profiles")
      .insert({ user_id: userId, label: "Test", brand_name: "Test" })
      .select()
      .single();
    const { data: project } = await db
      .from("projects")
      .insert({ user_id: userId, name: "Credit test", brand_profile_id: brand!.id })
      .select()
      .single();
    const { data: video } = await db
      .from("source_videos")
      .insert({ project_id: project!.id, kind: "competitor", storage_path: `${userId}/x.mp4` })
      .select()
      .single();
    const { data: analysis } = await db
      .from("video_analyses")
      .insert({ project_id: project!.id, source_video_id: video!.id, status: "completed" })
      .select()
      .single();
    const scripts: Record<number, string> = {};
    for (const d of [15, 30]) {
      const { data } = await db
        .from("scripts")
        .insert({
          project_id: project!.id,
          analysis_id: analysis!.id,
          style: "emotional",
          title: `${d}s`,
          body: "SCENE 1 — test",
          target_duration_seconds: d,
        })
        .select()
        .single();
      scripts[d] = data!.id;
    }

    const balance = async () =>
      (await db.from("profiles").select("credits_balance").eq("id", userId).single()).data!
        .credits_balance as number;
    const generate = (duration: 15 | 30, quality: string, aspectRatio = "9:16") =>
      fetch(`${BASE}/api/generations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({
          projectId: project!.id,
          scriptId: scripts[duration],
          provider: "seedance",
          aspectRatio,
          quality,
          cameraStyle: "commercial",
        }),
      });

    await step(
      "new account has 0 credits → generation refused with 402, nothing charged",
      async () => {
        assert.equal(await balance(), 0);
        const res = await generate(15, "high");
        assert.equal(res.status, 402);
        assert.equal(await balance(), 0);
      },
    );

    await db.rpc("reset_credits", { p_user_id: userId, p_target: 168, p_reason: "test_setup" });
    let expected = 168;
    const ids: string[] = [];
    for (const [duration, quality, cost] of [
      [15, "high", 5],
      [15, "ultra", 35],
      [30, "high", 40],
      [30, "ultra", 42],
    ] as const) {
      await step(
        `${duration}s ${quality === "high" ? "720p" : "1080p"} deducts ${cost} credits`,
        async () => {
          const res = await generate(duration, quality);
          const body = await res.json();
          assert.equal(res.status, 201, JSON.stringify(body));
          expected -= cost;
          assert.equal(await balance(), expected);
          assert.equal(body.generation.credits_charged, cost);
          assert.ok(body.generation.est_cost_usd > 0);
          ids.push(body.generation.id);
        },
      );
    }

    await step("1:1 aspect ratio and 480p are rejected (400) without charging", async () => {
      const before = await balance();
      assert.equal((await generate(15, "high", "1:1")).status, 400);
      assert.equal((await generate(15, "standard")).status, 400);
      assert.equal(await balance(), before);
    });

    await step("46 left: one more 30s 720p → 6, then the next is refused with 402", async () => {
      const ok = await generate(30, "high");
      assert.equal(ok.status, 201);
      expected -= 40;
      assert.equal(await balance(), expected);
      assert.equal((await generate(30, "high")).status, 402);
      assert.equal(await balance(), expected);
    });

    await step("a render that fails at the provider is refunded in full", async () => {
      // The mock provider "completes" without a video, which the pipeline treats as a failure.
      const res = await fetch(`${BASE}/api/generations/${ids[0]}`, { headers: { Cookie: cookie } });
      const body = await res.json();
      assert.equal(body.generation.status, "failed");
      assert.equal(await balance(), expected + 5);
    });

    await step(
      "three concurrent polls of a failing 35c render refund it exactly once",
      async () => {
        const before = await balance();
        // ids[1] is the 15s 1080p (35c) render, still processing; the mock provider fails it.
        const polls = await Promise.all(
          [0, 1, 2].map(() =>
            fetch(`${BASE}/api/generations/${ids[1]}`, { headers: { Cookie: cookie } }).then((r) =>
              r.json(),
            ),
          ),
        );
        for (const p of polls) assert.equal(p.generation.status, "failed");
        assert.equal(await balance(), before + 35);
      },
    );

    console.log(`\n${passed} checks passed`);
  } finally {
    await db.auth.admin.deleteUser(userId);
    console.log("cleanup: test user deleted");
  }
}

main().catch((err) => {
  console.error("\n✗ FAILED:", err);
  process.exit(1);
});
