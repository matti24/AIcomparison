"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { BenchmarkLegend, LazyBenchmarkChart } from "@/components/charts";
import { formatDate } from "@/lib/catalog";
import type { BenchmarkDefinition } from "@/lib/types";

export interface BenchmarkRow {
  modelSlug: string;
  modelName: string;
  modelPath: string;
  providerId: string;
  score: number;
  display: string;
  reportedBy: "provider" | "independent";
  version: string | null;
  conditions: string | null;
  date: string;
  sourceLabel: string;
  sourceUrl: string;
}

export function BenchmarkExplorer({ benchmarks, results }: { benchmarks: BenchmarkDefinition[]; results: Record<string, BenchmarkRow[]> }) {
  const { providerById } = useApp();
  const available = benchmarks.filter((benchmark) => results[benchmark.id]?.length);
  const [selected, setSelected] = useState(available[0]?.id ?? "");
  const [reporter, setReporter] = useState<"all" | "independent" | "provider">("all");
  const definition = benchmarks.find((benchmark) => benchmark.id === selected);
  const rows = useMemo(() => (results[selected] ?? [])
    .filter((row) => reporter === "all" || row.reportedBy === reporter)
    .sort((a, b) => (definition?.higherIsBetter === false ? a.score - b.score : b.score - a.score)), [results, selected, reporter, definition]);

  if (!available.length) return <p className="text-muted-foreground">No benchmark results recorded yet.</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] [&>*]:min-w-0">
      <nav aria-label="Benchmarks" className="lg:sticky lg:top-[calc(var(--header-height)+16px)] lg:self-start">
        <ul className="flex gap-1.5 overflow-x-auto pb-2 lg:grid lg:gap-0.5 lg:overflow-visible">
          {available.map((benchmark) => (
            <li key={benchmark.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelected(benchmark.id)}
                aria-current={selected === benchmark.id}
                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-[14px] text-muted-foreground hover:bg-surface-2 hover:text-foreground aria-[current=true]:bg-surface-2 aria-[current=true]:font-medium aria-[current=true]:text-foreground"
              >
                <span className="whitespace-nowrap">{benchmark.name}</span>
                <span className="text-xs tabular">{results[benchmark.id].length}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {definition && (
        <section aria-labelledby="bench-title" className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{definition.category.replace("-", " ")}</p>
              <h2 id="bench-title" className="mt-1 text-2xl">{definition.name}</h2>
              <p className="mt-1 max-w-2xl text-[14.5px] text-muted-foreground">{definition.description}</p>
              <a href={definition.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"><ExternalLink size={12} aria-hidden="true" /> About this benchmark</a>
            </div>
            <div className="flex rounded-md border p-0.5" role="group" aria-label="Reporter">
              {(["all", "independent", "provider"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={reporter === value} onClick={() => setReporter(value)} className="h-8 rounded px-3 text-[13px] text-muted-foreground aria-pressed:bg-surface-2 aria-pressed:font-medium aria-pressed:text-foreground">
                  {value === "all" ? "All" : value === "independent" ? "Independent" : "Provider-reported"}
                </button>
              ))}
            </div>
          </div>

          {definition.unit !== "elo" && rows.length > 0 && (
            <div className="panel mt-5 p-4">
              <LazyBenchmarkChart
                unit={definition.unit}
                maxValue={definition.unit === "%" ? 100 : undefined}
                data={rows.slice(0, 20).map((row) => ({
                  label: row.modelName,
                  score: row.score,
                  display: row.display,
                  reportedBy: row.reportedBy,
                  color: providerById.get(row.providerId)?.color ?? "#71717a",
                  date: formatDate(row.date),
                  source: row.sourceLabel,
                  conditions: row.conditions,
                  version: row.version,
                }))}
              />
              <div className="mt-2 border-t pt-3"><BenchmarkLegend /></div>
            </div>
          )}

          <div className="table-wrap mt-5">
            <table className="data-table">
              <caption className="sr-only">{definition.name} results</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky-col">Model</th>
                  <th scope="col" className="num">Score</th>
                  <th scope="col">Reported by</th>
                  <th scope="col">Version & conditions</th>
                  <th scope="col">Date</th>
                  <th scope="col">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const provider = providerById.get(row.providerId);
                  return (
                    <tr key={`${row.modelSlug}-${index}`}>
                      <th scope="row" className="sticky-col font-normal">
                        <Link href={row.modelPath} className="flex items-center gap-2 hover:underline">
                          {provider && <ProviderLogo provider={provider} size={22} />}
                          <span className="font-medium">{row.modelName}</span>
                        </Link>
                      </th>
                      <td className="num font-semibold">{row.display}</td>
                      <td><span className={row.reportedBy === "independent" ? "badge badge-new" : "badge"}>{row.reportedBy === "independent" ? "Independent" : "Provider"}</span></td>
                      <td className="!whitespace-normal min-w-[220px] text-[13px] text-muted-foreground">{[row.version, row.conditions].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="text-muted-foreground tabular">{formatDate(row.date, "short")}</td>
                      <td><a href={row.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-[220px] items-center gap-1 truncate text-[13px] text-muted-foreground hover:text-foreground"><ExternalLink size={11} aria-hidden="true" /> <span className="truncate">{row.sourceLabel}</span></a></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Results are listed exactly as published. Provider-reported scores often use different harnesses, prompts, tools, or effort settings than independent evaluations, so rows are not strictly comparable. We never combine benchmarks into a single score.
          </p>
        </section>
      )}
    </div>
  );
}
