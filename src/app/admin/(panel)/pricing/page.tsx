import { DataTable, fmtUsd } from "@/components/admin/DataTable";
import { requireAdminPage } from "@/lib/admin-auth";
import { getPricing, monthlyPriceCents, videosPerMonth } from "@/lib/pricing";
import { QUALITY_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Read-only view of billing_plans / credit_rates. Edit those rows in Supabase (Table editor or
 * SQL) — the app, landing page and dodo-webhook all read them live. A plan price change also
 * needs a new Dodo product (`npm run setup:dodo`).
 */
export default async function AdminPricingPage() {
  const { db } = await requireAdminPage();
  const { plans, rates } = await getPricing(db);

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Plans</h2>
        <DataTable
          rows={plans}
          rowKey={(r) => r.id}
          columns={[
            { header: "Id", cell: (r) => <code className="text-xs">{r.id}</code> },
            {
              header: "Billed",
              cell: (r) => `${fmtUsd(r.price_cents / 100)} / ${r.billing_interval}`,
            },
            { header: "Per month", cell: (r) => fmtUsd(monthlyPriceCents(r) / 100) },
            {
              header: "Credits / month",
              cell: (r) => r.credits_per_month,
              className: "text-right tabular-nums",
            },
            {
              header: "Revenue / credit",
              cell: (r) => `$${(monthlyPriceCents(r) / 100 / r.credits_per_month).toFixed(3)}`,
              className: "text-right tabular-nums",
            },
            {
              header: "Dodo product",
              cell: (r) =>
                r.dodo_product_id ? (
                  <code className="text-xs">{r.dodo_product_id}</code>
                ) : (
                  <span className="text-xs text-destructive">not set — run setup:dodo</span>
                ),
            },
          ]}
        />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Credit cost per video and margin at each plan</h2>
        <DataTable
          rows={rates}
          rowKey={(r) => `${r.duration_seconds}-${r.quality}`}
          columns={[
            {
              header: "Video",
              cell: (r) => `${r.duration_seconds}s · ${QUALITY_LABELS[r.quality]}`,
            },
            { header: "Credits", cell: (r) => r.credits, className: "text-right tabular-nums" },
            {
              header: "Est. cost",
              cell: (r) => fmtUsd(r.est_cost_usd),
              className: "text-right tabular-nums",
            },
            ...plans.map((p) => ({
              header: p.id,
              cell: (r: (typeof rates)[number]) => {
                const revenue = (monthlyPriceCents(p) / 100 / p.credits_per_month) * r.credits;
                const margin = Math.round(((revenue - r.est_cost_usd) / revenue) * 100);
                return (
                  <span className={margin < 15 ? "font-semibold text-destructive" : undefined}>
                    {videosPerMonth(p, r)}/mo · {margin}%
                  </span>
                );
              },
              className: "text-right tabular-nums whitespace-nowrap",
            })),
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Each plan cell: videos one month&apos;s credits buy · gross margin per video at the
          estimated cost. Red is under 15%.
        </p>
      </section>
    </>
  );
}
