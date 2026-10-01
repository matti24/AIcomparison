"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface BenchmarkDatum {
  label: string;
  score: number;
  display: string;
  reportedBy: "provider" | "independent";
  color: string;
  date: string;
  source: string;
  conditions: string | null;
  version: string | null;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: BenchmarkDatum }[] }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className="chart-tooltip max-w-[280px]">
      <p className="font-semibold">{datum.label}</p>
      <p className="tabular">{datum.display}</p>
      <p className="mt-1 text-muted-foreground">{datum.reportedBy === "independent" ? "Independent evaluation" : "Provider-reported"} · {datum.date}</p>
      {datum.version && <p className="text-muted-foreground">Version: {datum.version}</p>}
      {datum.conditions && <p className="text-muted-foreground">{datum.conditions}</p>}
      <p className="mt-1 text-muted-foreground">Source: {datum.source}</p>
    </div>
  );
}

export default function BenchmarkChart({ data, unit, maxValue }: { data: BenchmarkDatum[]; unit: string; maxValue?: number }) {
  const height = Math.max(120, data.length * 40 + 40);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" domain={[0, maxValue ?? "auto"]} tickFormatter={(value) => unit === "%" ? `${value}%` : String(value)} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" width={170} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 12.5 }} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)" }} />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((datum, index) => (
            <Cell
              key={index}
              fill={datum.color}
              fillOpacity={datum.reportedBy === "independent" ? 1 : 0.55}
              stroke={datum.color}
              strokeWidth={1}
              strokeDasharray={datum.reportedBy === "provider" ? "4 2" : undefined}
            />
          ))}
          <LabelList dataKey="display" position="right" style={{ fontSize: 12, fill: "var(--foreground)", fontVariantNumeric: "tabular-nums" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
