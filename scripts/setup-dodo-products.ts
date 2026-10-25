/**
 * One-time setup (idempotent — safe to re-run): for every row in billing_plans, creates a Dodo
 * subscription product with that row's price and interval and writes its id back to
 * billing_plans.dodo_product_id. Then registers the dodo-webhook Edge Function as a webhook
 * endpoint and prints the signing secret to set on the function.
 *
 * Prices come from the database, not this file — change billing_plans first, then re-run. An
 * existing product is matched by name and left as is; Dodo prices are immutable on purpose, so a
 * price change means a new product (rename or archive the old one in the Dodo dashboard first).
 *
 * Usage: DODO_PAYMENTS_API_KEY, DODO_PAYMENTS_ENVIRONMENT, NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY in .env / .env.local, then `npm run setup:dodo`.
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import DodoPayments from "dodopayments";

const PROJECT_REF = "xvtkjkvxjxsbeispjlrh";
const WEBHOOK_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/dodo-webhook`;
const WEBHOOK_EVENTS = [
  "payment.succeeded",
  "payment.failed",
  "refund.succeeded",
  "subscription.active",
  "subscription.renewed",
  "subscription.updated",
  "subscription.plan_changed",
  "subscription.on_hold",
  "subscription.cancelled",
  "subscription.expired",
  "subscription.failed",
] as const;

// Minimal .env loader — .env.local wins over .env, never overwrites the real environment.
function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ""] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name} — add it to .env.local and re-run.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const environment =
    (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode" | undefined) ?? "test_mode";
  const dodo = new DodoPayments({ bearerToken: required("DODO_PAYMENTS_API_KEY"), environment });
  const db = createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
  );
  console.log(`Using Dodo ${environment}...\n`);

  const { data: plans, error } = await db.from("billing_plans").select("*").order("sort_order");
  if (error) throw error;

  const existing = new Map<string, string>();
  for await (const product of dodo.products.list()) {
    if (product.name) existing.set(product.name, product.product_id);
  }

  for (const plan of plans ?? []) {
    const interval = plan.billing_interval === "year" ? "Year" : "Month";
    const productName = `Adiy AI — ${plan.name} (${plan.billing_interval === "year" ? "yearly" : "monthly"})`;
    let productId = existing.get(productName);
    if (productId) {
      console.log(`✓ ${productName} already exists — ${productId}`);
    } else {
      const created = await dodo.products.create({
        name: productName,
        description: `${plan.credits_per_month} credits every month`,
        tax_category: "saas",
        price: {
          type: "recurring_price",
          currency: "USD",
          price: plan.price_cents,
          discount: 0,
          purchasing_power_parity: false,
          payment_frequency_count: 1,
          payment_frequency_interval: interval,
          // How long the subscription runs before it needs re-subscribing — effectively forever.
          subscription_period_count: 10,
          subscription_period_interval: "Year",
        },
      });
      productId = created.product_id;
      console.log(`+ created ${productName} — ${productId}`);
    }
    const { error: updateError } = await db
      .from("billing_plans")
      .update({ dodo_product_id: productId })
      .eq("id", plan.id);
    if (updateError) throw updateError;
  }

  let webhookId: string | null = null;
  for await (const webhook of dodo.webhooks.list()) {
    if (webhook.url === WEBHOOK_URL) webhookId = webhook.id;
  }
  if (webhookId) {
    await dodo.webhooks.update(webhookId, { filter_types: [...WEBHOOK_EVENTS] });
    console.log(`\n✓ Webhook endpoint already registered — ${webhookId} (event list updated)`);
  } else {
    webhookId = (
      await dodo.webhooks.create({
        url: WEBHOOK_URL,
        description: "Adiy AI billing",
        filter_types: [...WEBHOOK_EVENTS],
      })
    ).id;
    console.log(`\n+ registered webhook endpoint — ${webhookId}`);
  }
  const secret = (await dodo.webhooks.retrieveSecret(webhookId)).secret;

  console.log("\n──────────────────────────────────────────────────────────────");
  console.log(
    "billing_plans.dodo_product_id is filled in — checkout works once the app is deployed.",
  );
  console.log("Set the webhook signing secret on the Edge Function:\n");
  console.log(
    `supabase secrets set DODO_PAYMENTS_WEBHOOK_KEY=${secret ?? "<copy from Dodo dashboard>"} --project-ref ${PROJECT_REF}`,
  );
  console.log("──────────────────────────────────────────────────────────────");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
