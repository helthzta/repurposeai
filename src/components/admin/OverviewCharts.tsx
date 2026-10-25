"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface DailyPoint {
  day: string; // "25 Oct"
  revenue: number; // USD
  completed: number;
  failed: number;
}

// Validated pair (dataviz validator, light + dark): blue = completed / revenue, red = failed.
const revenueConfig = {
  revenue: { label: "Revenue (USD)", theme: { light: "#2563EB", dark: "#3B82F6" } },
} satisfies ChartConfig;

const generationsConfig = {
  completed: { label: "Completed", theme: { light: "#2563EB", dark: "#3B82F6" } },
  failed: { label: "Failed", theme: { light: "#DC2626", dark: "#EF4444" } },
} satisfies ChartConfig;

const axis = { tickLine: false, axisLine: false, tickMargin: 8, fontSize: 11 } as const;

export function OverviewCharts({ data }: { data: DailyPoint[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-semibold">Revenue · last 30 days</p>
        <p className="text-xs text-muted-foreground">Succeeded Dodo payments, per day</p>
        <ChartContainer config={revenueConfig} className="mt-4 h-60 w-full">
          <BarChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.5} />
            <XAxis dataKey="day" {...axis} interval="preserveStartEnd" minTickGap={24} />
            <YAxis {...axis} width={40} tickFormatter={(v) => `$${v}`} />
            <ChartTooltip cursor={{ fillOpacity: 0.08 }} content={<ChartTooltipContent />} />
            <Bar
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
            />
          </BarChart>
        </ChartContainer>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-semibold">Generations · last 30 days</p>
        <p className="text-xs text-muted-foreground">Completed and failed renders, per day</p>
        <ChartContainer config={generationsConfig} className="mt-4 h-60 w-full">
          <BarChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.5} />
            <XAxis dataKey="day" {...axis} interval="preserveStartEnd" minTickGap={24} />
            <YAxis {...axis} width={28} allowDecimals={false} />
            <ChartTooltip cursor={{ fillOpacity: 0.08 }} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {/* 2px surface gap between stacked segments via the stroke. */}
            <Bar
              dataKey="completed"
              stackId="g"
              fill="var(--color-completed)"
              stroke="var(--card)"
              strokeWidth={2}
              maxBarSize={18}
            />
            <Bar
              dataKey="failed"
              stackId="g"
              fill="var(--color-failed)"
              stroke="var(--card)"
              strokeWidth={2}
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
