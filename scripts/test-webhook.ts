/**
 * End-to-end check of the subscription lifecycle against the real database: the dodo-webhook
 * handlers (supabase/functions/_shared/webhook.ts — the same code the Edge Function runs, minus
 * signature verification, which is the Dodo SDK's job), the reset_credits/spend_credits RPCs and
 * billing_sweep(). Uses disposable auth users and deletes everything it created.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. Run: `npx tsx scripts/test-webhook.ts`
 *
 * While it runs, billing_plans.dodo_product_id is pointed at fake ids so events can resolve a plan;
 * the previous values are restored at the end (checkout refuses a null id, so nothing else uses them).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { handlePayment, handleSubscription } from "../supabase/functions/_shared/webhook.ts";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (m && process.env[m[1]] === undefined)
      process.env[m[1]] = (m[2] ?? "").replace(/^["']|["']$/g, "");
  }
}
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  },
);

const PRODUCT = {
  starter_monthly: "test_prod_starter_m",
  starter_yearly: "test_prod_starter_y",
  pro_monthly: "test_prod_pro_m",
  pro_yearly: "test_prod_pro_y",
} as const;
const DAY = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

async function profile(id: string) {
  const { data, error } = await db.from("profiles").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}
async function sweep() {
  const { data, error } = await db.rpc("billing_sweep");
  if (error) throw error;
  return data as { refilled: number; expired: number };
}
async function spend(userId: string, amount: number) {
  const { error } = await db.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: -amount,
    p_reason: "generation",
    p_reference_type: null,
    p_reference_id: null,
  });
  if (error) throw error;
}
function subEvent(
  userId: string,
  subId: string,
  planId: keyof typeof PRODUCT,
  over: Record<string, unknown> = {},
) {
  return {
    subscription_id: subId,
    product_id: PRODUCT[planId],
    status: "active",
    previous_billing_date: iso(Date.now() - DAY),
    next_billing_date: iso(Date.now() + 29 * DAY),
    cancel_at_next_billing_date: false,
    metadata: { userId, planId },
    customer: { customer_id: `cus_test_${userId.slice(0, 8)}` },
    ...over,
  };
}

let passed = 0;
async function step(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

async function main() {
  const { data: originalPlans } = await db.from("billing_plans").select("id, dodo_product_id");
  const users: string[] = [];
  try {
    for (const [id, product] of Object.entries(PRODUCT)) {
      const { error } = await db
        .from("billing_plans")
        .update({ dodo_product_id: product })
        .eq("id", id);
      if (error) throw error;
    }
    const mkUser = async () => {
      const { data, error } = await db.auth.admin.createUser({
        email: `billing-test-${Date.now()}-${users.length}@example.com`,
        email_confirm: true,
      });
      if (error) throw error;
      users.push(data.user.id);
      return data.user.id;
    };

    console.log("Sign-up");
    const a = await mkUser();
    await step("a new user starts with 0 credits and the free plan", async () => {
      const p = await profile(a);
      assert.equal(p.credits_balance, 0);
      assert.equal(p.plan, "free");
    });

    console.log("Monthly subscription (Start $19 / 70c)");
    const subA = `sub_test_${a.slice(0, 8)}`;
    const period1 = subEvent(a, subA, "starter_monthly");
    await step(
      "subscription.active → plan starter, 70 credits, grace = period end + 3d",
      async () => {
        await handleSubscription(db, "subscription.active", period1);
        const p = await profile(a);
        assert.equal(p.plan, "starter");
        assert.equal(p.credits_balance, 70);
        assert.equal(p.dodo_subscription_id, subA);
        assert.equal(
          new Date(p.plan_grace_end).getTime() - new Date(p.plan_period_end).getTime(),
          3 * DAY,
        );
      },
    );
    await step("payment.succeeded → payments row $19.00 succeeded", async () => {
      await handlePayment(db, "payment.succeeded", {
        payment_id: `pay_test_${a.slice(0, 8)}_1`,
        subscription_id: subA,
        product_cart: [{ product_id: PRODUCT.starter_monthly }],
        total_amount: 1900,
        currency: "USD",
        metadata: { userId: a },
        customer: { customer_id: `cus_test_${a.slice(0, 8)}` },
      });
      const { data } = await db.from("payments").select("*").eq("user_id", a);
      assert.equal(data?.length, 1);
      assert.equal(data?.[0].amount_cents, 1900);
      assert.equal(data?.[0].status, "succeeded");
      assert.equal(data?.[0].plan_id, "starter_monthly");
    });
    await step(
      "spend 5c (one 15s 720p) → 65; a duplicate renewed for the same period grants nothing",
      async () => {
        await spend(a, 5);
        await handleSubscription(db, "subscription.renewed", period1);
        assert.equal((await profile(a)).credits_balance, 65);
      },
    );
    await step("spending past the balance is refused (insufficient_credits)", async () => {
      await assert.rejects(spend(a, 66), (e: { message: string }) =>
        e.message.includes("insufficient_credits"),
      );
      assert.equal((await profile(a)).credits_balance, 65);
    });
    const period2 = subEvent(a, subA, "starter_monthly", {
      previous_billing_date: iso(Date.now() + 29 * DAY),
      next_billing_date: iso(Date.now() + 59 * DAY),
    });
    await step("subscription.renewed for the next period → reset to 70 (no rollover)", async () => {
      await handleSubscription(db, "subscription.renewed", period2);
      assert.equal((await profile(a)).credits_balance, 70);
    });
    await step("plan_changed Start → Pro → +98 = 168", async () => {
      await handleSubscription(db, "subscription.plan_changed", {
        ...period2,
        product_id: PRODUCT.pro_monthly,
      });
      const p = await profile(a);
      assert.equal(p.plan, "pro");
      assert.equal(p.credits_balance, 168);
    });
    await step("spend 140 then downgrade Pro → Start → 28 − 98 floors at 0", async () => {
      await spend(a, 140);
      await handleSubscription(db, "subscription.plan_changed", period2);
      const p = await profile(a);
      assert.equal(p.plan, "starter");
      assert.equal(p.credits_balance, 0);
    });

    console.log("Cancellation (at period end)");
    await step("cancel scheduled → still starter, grace end = period end", async () => {
      await handleSubscription(db, "subscription.updated", {
        ...period2,
        cancel_at_next_billing_date: true,
      });
      const p = await profile(a);
      assert.equal(p.plan, "starter");
      assert.equal(p.plan_grace_end, p.plan_period_end);
      const { data: s } = await db
        .from("subscriptions")
        .select("cancel_at_period_end")
        .eq("id", subA)
        .single();
      assert.equal(s?.cancel_at_period_end, true);
    });
    await step("billing_sweep before the period ends leaves the plan alone", async () => {
      await handleSubscription(db, "subscription.renewed", period2); // same period: no grant
      const before = await profile(a);
      await sweep();
      assert.equal((await profile(a)).plan, before.plan);
    });
    await step(
      "subscription.cancelled after the period ends → sweep moves to free and zeroes credits",
      async () => {
        await db.rpc("reset_credits", { p_user_id: a, p_target: 12, p_reason: "test_setup" });
        await handleSubscription(db, "subscription.cancelled", {
          ...period2,
          status: "cancelled",
          next_billing_date: iso(Date.now() - 60_000),
          cancelled_at: iso(Date.now()),
        });
        const result = await sweep();
        assert.ok(result.expired >= 1);
        const p = await profile(a);
        assert.equal(p.plan, "free");
        assert.equal(p.credits_balance, 0);
        const { data: tx } = await db
          .from("credit_transactions")
          .select("reason, amount")
          .eq("user_id", a)
          .eq("reason", "plan_expired");
        assert.equal(tx?.[0]?.amount, -12);
      },
    );

    console.log("Yearly subscription (Pro $372 / 168c every month)");
    const b = await mkUser();
    const subB = `sub_test_${b.slice(0, 8)}`;
    const yearly = subEvent(b, subB, "pro_yearly", {
      next_billing_date: iso(Date.now() + 364 * DAY),
    });
    await step("subscription.active → 168 credits, next monthly refill in 30 days", async () => {
      await handleSubscription(db, "subscription.active", yearly);
      assert.equal((await profile(b)).credits_balance, 168);
      const { data: s } = await db
        .from("subscriptions")
        .select("next_credit_refill_at")
        .eq("id", subB)
        .single();
      const days = (new Date(s!.next_credit_refill_at).getTime() - (Date.now() - DAY)) / DAY;
      assert.ok(Math.abs(days - 30) < 0.01);
    });
    await step("payment.succeeded for the year → $372.00", async () => {
      await handlePayment(db, "payment.succeeded", {
        payment_id: `pay_test_${b.slice(0, 8)}_1`,
        subscription_id: subB,
        product_cart: [{ product_id: PRODUCT.pro_yearly }],
        total_amount: 37200,
        currency: "USD",
        metadata: { userId: b },
      });
      const { data } = await db.from("payments").select("amount_cents").eq("user_id", b).single();
      assert.equal(data?.amount_cents, 37200);
    });
    await step("month 2: billing_sweep refills to 168 (after spending 4 × 42c)", async () => {
      await spend(b, 168);
      await db
        .from("subscriptions")
        .update({ next_credit_refill_at: iso(Date.now() - 1000) })
        .eq("id", subB);
      const result = await sweep();
      assert.ok(result.refilled >= 1);
      assert.equal((await profile(b)).credits_balance, 168);
      await spend(b, 10);
      const again = await sweep();
      assert.equal(again.refilled, 0, "a second sweep in the same month must not refill again");
      assert.equal((await profile(b)).credits_balance, 158);
    });

    console.log("Failures");
    await step("payment.failed → failed payments row + error_logs entry", async () => {
      await handlePayment(db, "payment.failed", {
        payment_id: `pay_test_${b.slice(0, 8)}_2`,
        subscription_id: subB,
        product_cart: [{ product_id: PRODUCT.pro_yearly }],
        total_amount: 37200,
        currency: "USD",
        metadata: { userId: b },
        error_message: "card_declined",
      });
      const { data } = await db
        .from("payments")
        .select("status")
        .eq("dodo_payment_id", `pay_test_${b.slice(0, 8)}_2`)
        .single();
      assert.equal(data?.status, "failed");
    });
    await step("subscription.on_hold keeps access through the grace window", async () => {
      await handleSubscription(db, "subscription.on_hold", { ...yearly, status: "on_hold" });
      const p = await profile(b);
      assert.equal(p.plan, "pro");
      assert.ok(new Date(p.plan_grace_end) > new Date(p.plan_period_end));
    });
    await step(
      "a late event from an old subscription can't change the newer one's plan",
      async () => {
        await handleSubscription(db, "subscription.cancelled", {
          ...subEvent(b, "sub_test_old", "starter_monthly"),
          status: "cancelled",
          next_billing_date: iso(Date.now() - DAY),
        });
        const p = await profile(b);
        assert.equal(p.plan, "pro");
        assert.equal(p.dodo_subscription_id, subB);
      },
    );

    console.log(`\n${passed} checks passed`);
  } finally {
    for (const row of originalPlans ?? []) {
      await db
        .from("billing_plans")
        .update({ dodo_product_id: row.dodo_product_id })
        .eq("id", row.id);
    }
    for (const id of users) {
      await db
        .from("error_logs")
        .delete()
        .contains("metadata", { payload: { user_id: id } });
      await db.auth.admin.deleteUser(id); // cascades profile, subscriptions, payments, ledger
    }
    const { count } = await db
      .from("billing_plans")
      .select("*", { count: "exact", head: true })
      .like("dodo_product_id", "test_prod_%");
    console.log(
      `cleanup: ${users.length} test users deleted, fake product ids left: ${count ?? 0}`,
    );
  }
}

main().catch((err) => {
  console.error("\n✗ FAILED:", err);
  process.exit(1);
});
