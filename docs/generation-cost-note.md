# Why real generation cost differs from the estimate

Source: `ESTIMATE ADIY ai.xlsx`, column F ("Actual cost ($)", headed "HERE FLACTUATION").

## What the sheet shows

The same job, a 15-second 720p video, was measured three ways:

| Source | Cost of one 15s 720p video |
|---|---|
| Provider website list price (E9) | $2.27 |
| Measured run A (F9) | $0.64 |
| Measured run B (**F10**): account balance went from $10.36 to $8.99 | **$1.37** |

Run B cost more than twice run A for the same output. The 30-second runs were more stable: $9.87 to $2.93, so $6.94 (F21).

## Why the real cost moves

1. **Billed on what is actually generated, not a flat price.** OpenRouter bills each Seedance job on its real output (seconds × resolution, plus the size of the prompt and reference images). The list price is a rough average. A longer script, a reference image, or a model that renders more frames costs more.
2. **Retries and failed attempts are billed.** If the provider errors or times out and the job is resubmitted, every attempt costs money, but the customer gets one video. Run B most likely includes a retry or a second partial job.
3. **Different models behind the same button.** 15s 720p uses `seedance-2.0-fast`, 15s 1080p uses `seedance-2.0`, and 30s uses `seedance-2.5`. Each has its own rate, and providers change those rates without notice.
4. **Balance-based measurement.** Reading the account balance before and after (as in F10) also catches anything else running at the same time, such as the Gemini script and scoring calls. Column I puts those at ₹3.7–7.09 per video, and more for a Hinglish script.
5. **Currency and fees.** Top-ups are paid in INR and billed in USD, so the exchange rate and payment fees move the effective cost.

## What this means for credits and payments

- **Customers pay fixed prices.** A plan is $19 or $39 a month ($15 or $31 a month billed yearly). A video always costs the same credits (5 / 35 / 40 / 42), so cost swings never reach the customer's invoice or balance.
- **The margin absorbs the swing.** At Start monthly a credit brings in about $0.27, so a 5-credit video brings in $1.36. That's about a 53% margin at run A's $0.64, and **break-even at run B's $1.37**. On Start yearly ($0.21 a credit) the same video brings in $1.07, which is **a loss** at run B's cost. Pro yearly on 30s 720p brings in $7.38 against $6.94, about a 6% margin. These are the plans to watch.
- **The real cost is now measured, not guessed.** Each generation stores both the estimate (`est_cost_usd`, from `credit_rates`) and what OpenRouter actually billed (`provider_cost_usd`, the job's `usage.cost`). The admin Generations page shows the difference per video, and the dashboard shows real cost and gross margin for the last 30 days.
- **Re-pricing is a data change.** If real costs stay above estimate, edit `credit_rates` (credits per video or est. cost) or `billing_plans` in Supabase. Credit changes apply to the next generation. Past charges and active subscriptions keep their price; a new plan price needs a new Dodo product (`npm run setup:dodo`), and existing subscribers stay on their old price until they change plan.
- **Failed renders are refunded in credits automatically**, so a provider failure costs us the provider fee but never costs the customer credits.
