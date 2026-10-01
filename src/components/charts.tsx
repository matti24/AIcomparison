"use client";

import dynamic from "next/dynamic";
import type { BenchmarkDatum } from "@/components/benchmark-chart";

export type { BenchmarkDatum };

export function ChartSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3 py-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-5" style={{ width: `${70 - index * 12}%` }} />
        </div>
      ))}
    </div>
  );
}

/** Recharts is only loaded on pages that actually render a chart. */
export const LazyBenchmarkChart = dynamic(() => import("@/components/benchmark-chart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export function BenchmarkLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded-sm bg-foreground" aria-hidden="true" /> Independent evaluation</span>
      <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-4 rounded-sm border border-dashed border-foreground bg-foreground/40" aria-hidden="true" /> Provider-reported</span>
    </div>
  );
}
