/**
 * One-time setup: creates the Starter/Pro one-time-payment Dodo Products (idempotently — safe to
 * re-run) and a webhook endpoint pointed at the deployed dodo-webhook Edge Function, then prints
 * exactly what to paste into .env.local and the one CLI command needed to finish setup.
 *
 * Usage:
 *   1. Add DODO_PAYMENTS_API_KEY (and DODO_PAYMENTS_ENVIRONMENT=test_mode) to .env.local
 *   2. npm run setup:dodo
 */
import { readFileSync, existsSync } from "node:fs";
import DodoPayments from "dodopayments";
import { PLAN_CONFIG } from "../src/lib/payments/plans";

const WEBHOOK_URL = "https://xxitlqjgmfqxesqiuouk.supabase.co/functions/v1/dodo-webhook";

// Minimal .env loader (no dependency) — .env.local wins over .env, matching Next.js's own
// precedence, and never overwrites a var already set in the actual process environment.
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
loadEnvFile(".env");
loadEnvFile(".env.local");

async function main() {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    console.error("Missing DODO_PAYMENTS_API_KEY — add it to .env.local and re-run.");
    process.exit(1);
  }
  const environment =
    (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode" | undefined) ?? "test_mode";

  const client = new DodoPayments({ bearerToken: apiKey, environment });
  console.log(`Using Dodo ${environment}...\n`);

  const productIds: Record<string, string> = {};

  for (const [key, plan] of Object.entries(PLAN_CONFIG)) {
    const productName = `Repurpose AI — ${plan.name}`;

    let existingId: string | null = null;
    for await (const product of client.products.list()) {
      if (product.name === productName) {
        existingId = product.product_id;
        break;
      }
    }

    if (existingId) {
      console.log(`✓ ${productName} already exists — ${existingId}`);
      productIds[key] = existingId;
      continue;
    }

    const created = await client.products.create({
      name: productName,
      tax_category: "saas",
      price: {
        type: "one_time_price",
        currency: "USD",
        price: plan.priceCents,
        discount: 0,
        purchasing_power_parity: false,
      },
    });
    console.log(`+ created ${productName} — ${created.product_id}`);
    productIds[key] = created.product_id;
  }

  let webhookSecret: string | null = null;
  let existingWebhookId: string | null = null;
  for await (const webhook of client.webhooks.list()) {
    if (webhook.url === WEBHOOK_URL) {
      existingWebhookId = webhook.id;
      break;
    }
  }

  if (existingWebhookId) {
    console.log(`\n✓ Webhook endpoint already registered — ${existingWebhookId}`);
    const secretResponse = await client.webhooks.retrieveSecret(existingWebhookId);
    webhookSecret = secretResponse.secret ?? null;
  } else {
    const webhook = await client.webhooks.create({
      url: WEBHOOK_URL,
      description: "Repurpose AI billing",
      filter_types: ["payment.succeeded", "payment.failed"],
    });
    console.log(`\n+ registered webhook endpoint — ${webhook.id}`);
    const secretResponse = await client.webhooks.retrieveSecret(webhook.id);
    webhookSecret = secretResponse.secret ?? null;
  }

  console.log("\n──────────────────────────────────────────────────────────────");
  console.log("Add these to .env.local:\n");
  console.log(`DODO_STARTER_PRODUCT_ID=${productIds.starter}`);
  console.log(`DODO_PRO_PRODUCT_ID=${productIds.pro}`);

  if (webhookSecret) {
    console.log(
      "\nThen set the webhook signing secret on the Edge Function (this is the one value\n" +
        "this script can't put in .env for you — it belongs to the deployed function, not\n" +
        "the Next.js app) by running:\n",
    );
    console.log(
      `supabase secrets set DODO_PAYMENTS_WEBHOOK_KEY=${webhookSecret} --project-ref xxitlqjgmfqxesqiuouk`,
    );
  } else {
    console.log(
      "\nCouldn't read the webhook secret via the API — open the endpoint in the Dodo\n" +
        "dashboard (Developer → Webhooks) to copy it, then run:\n" +
        "supabase secrets set DODO_PAYMENTS_WEBHOOK_KEY=<secret> --project-ref xxitlqjgmfqxesqiuouk",
    );
  }
  console.log("──────────────────────────────────────────────────────────────");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
