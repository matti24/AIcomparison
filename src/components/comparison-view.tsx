"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Check, Copy, Minus, Plus, Share2, X } from "lucide-react";
import { useApp, MAX_COMPARE } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { BenchmarkLegend, LazyBenchmarkChart, type BenchmarkDatum } from "@/components/charts";
import { CostCalculator } from "@/components/cost-calculator";
import { SourceMark } from "@/components/source-mark";
import { Button } from "@/components/ui/button";
import { comparisonPath, formatDate, statusLabels } from "@/lib/catalog";
import { comparisonSections, highlightedIndices, rowIsDifferent, type ComparisonRow } from "@/lib/comparison";
import type { AIModel, BenchmarkDefinition, Provider } from "@/lib/types";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function CellValue({ row, model, highlighted }: { row: ComparisonRow; model: AIModel; highlighted: boolean }) {
  const cell = row.read(model);
  const isBool = typeof cell.value === "boolean";
  return (
    <>
      {cell.value === null ? (
        <span className="unknown text-[13px]">Not disclosed</span>
      ) : isBool ? (
        <span className={cn("inline-flex items-center gap-1.5", cell.value ? "yes" : "no")}>
          {cell.value ? <Check size={15} aria-hidden="true" /> : <Minus size={15} aria-hidden="true" />}
          <span className="text-foreground">{cell.display}</span>
        </span>
      ) : (
        <span className={cn(highlighted && "font-semibold")}>{cell.display}</span>
      )}
      {highlighted && <span className="cmp-best">{row.highlight === "lowest" ? "Lowest" : "Largest"}</span>}
      <SourceMark source={cell.source} note={cell.value === null ? undefined : cell.note} />
    </>
  );
}

export function ComparisonView({ models, providers, benchmarks }: { models: AIModel[]; providers: Provider[]; benchmarks: BenchmarkDefinition[] }) {
  const router = useRouter();
  const { modelBySlug, setSelected, openPalette, selected } = useApp();
  const [diffOnly, setDiffOnly] = useState(false);
  const providerMap = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);
  const sections = useMemo(() => comparisonSections({ providers }), [providers]);
  const slugs = models.map((model) => model.slug);
  const summaries = slugs.flatMap((slug) => modelBySlug.get(slug) ?? []);

  useEffect(() => {
    track("comparison_viewed", { models: slugs.join(",") });
    // Keep the tray in sync so "add model" continues this comparison.
    if (slugs.join() !== selected.join()) setSelected(slugs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs.join()]);

  const navigate = (next: string[]) => router.push(comparisonPath(next));
  const remove = (slug: string) => {
    const next = slugs.filter((item) => item !== slug);
    if (next.length >= 2) navigate(next);
    else { setSelected(next); router.push("/compare"); }
  };
  const swap = () => navigate([...slugs].reverse());

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link. Copy it from the address bar.");
    }
  }
  async function share() {
    const title = models.map((model) => model.name).join(" vs ");
    if (navigator.share) {
      try { await navigator.share({ title: `${title} — AI Compare`, url: location.href }); } catch { /* cancelled */ }
    } else copyLink();
  }

  const cols = models.length;
  const style = { "--cols": cols } as React.CSSProperties;

  const benchmarkRows = useMemo(() => {
    const ids = [...new Set(models.flatMap((model) => model.benchmarks.map((result) => result.benchmarkId)))];
    return ids
      .map((id) => ({ definition: benchmarks.find((entry) => entry.id === id), results: models.map((model) => model.benchmarks.filter((result) => result.benchmarkId === id).sort((a, b) => Number(b.reportedBy === "independent") - Number(a.reportedBy === "independent"))[0] ?? null) }))
      .filter((row) => row.definition)
      .sort((a, b) => b.results.filter(Boolean).length - a.results.filter(Boolean).length);
  }, [models, benchmarks]);

  const shared = benchmarkRows.filter((row) => row.results.filter(Boolean).length >= 2 && row.definition!.unit === "%").slice(0, 4);

  const header = (
    <div className="cmp-row" role="row">
      <div className="cmp-label !bg-transparent text-xs font-medium uppercase tracking-wide" role="columnheader">
        Model
      </div>
      {models.map((model) => {
        const provider = providerMap.get(model.providerId)!;
        const summary = modelBySlug.get(model.slug);
        return (
          <div key={model.slug} className="flex items-center gap-2.5">
            <ProviderLogo provider={provider} size={30} />
            <div className="min-w-0 flex-1">
              <Link href={summary?.path ?? "#"} className="block truncate text-[14.5px] font-semibold hover:underline">{model.name}</Link>
              <p className="truncate text-xs text-muted-foreground">{provider.name}</p>
            </div>
            <button type="button" className="icon-btn !size-7 shrink-0" onClick={() => remove(model.slug)} aria-label={`Remove ${model.name}`}><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <div className="container-page flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-2 inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border px-3 text-[13px] font-medium shadow-[var(--shadow-sm)]">
            <input type="checkbox" className="checkbox" checked={diffOnly} onChange={(event) => setDiffOnly(event.target.checked)} />
            Show differences only
          </label>
          {models.length < MAX_COMPARE && <Button variant="outline" size="sm" onClick={() => openPalette("add-to-compare")}><Plus size={14} /> Add model</Button>}
          {models.length === 2 && <Button variant="outline" size="sm" onClick={swap}><ArrowLeftRight size={14} /> Swap</Button>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}><Copy size={14} /> Copy link</Button>
          <Button variant="outline" size="sm" onClick={share}><Share2 size={14} /> Share</Button>
        </div>
      </div>

      <div className="cmp" style={style}>
        <div className="cmp-head overflow-hidden" id="cmp-sticky-head" role="region" aria-label="Compared models">
          <div className="container-page"><div className="overflow-hidden" data-sync-scroll>{header}</div></div>
        </div>
        <div className="container-page">
          <div className="table-wrap !overflow-x-auto" role="table" aria-label={`Comparison of ${models.map((model) => model.name).join(", ")}`} onScroll={(event) => {
            const target = document.querySelector<HTMLElement>("#cmp-sticky-head [data-sync-scroll]");
            if (target) target.scrollLeft = event.currentTarget.scrollLeft;
          }}>
            <div className="sr-only" role="rowgroup">
              <div role="row"><span role="columnheader">Attribute</span>{models.map((model) => <span key={model.slug} role="columnheader">{model.name}</span>)}</div>
            </div>
            <div className="cmp-body" role="rowgroup">
              {sections.map((section) => {
                const rows = diffOnly ? section.rows.filter((row) => rowIsDifferent(row, models)) : section.rows;
                return (
                  <div key={section.id} id={section.id} className="scroll-mt-[180px]">
                    <div className="cmp-section-title" role="row"><span role="rowheader">{section.title}</span>{diffOnly && <span className="normal-case tracking-normal font-normal">{rows.length} of {section.rows.length} differ</span>}</div>
                    {rows.map((row) => {
                      const different = rowIsDifferent(row, models);
                      const best = highlightedIndices(row, models);
                      return (
                        <div key={row.key} className="cmp-row" role="row">
                          <div className="cmp-label" role="rowheader">
                            {row.label}
                            {row.help && <SourceMark note={row.help} />}
                          </div>
                          {models.map((model, index) => (
                            <div key={model.slug} className="cmp-cell" role="cell" data-diff={different}>
                              <CellValue row={row} model={model} highlighted={best.includes(index)} />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {rows.length === 0 && <div className="cmp-row"><div className="cmp-label">—</div><div className="cmp-cell text-[13px] text-muted-foreground" style={{ gridColumn: `span ${cols}` }}>No differences in this section.</div></div>}
                  </div>
                );
              })}

              <div id="benchmarks" className="scroll-mt-[180px]">
                <div className="cmp-section-title" role="row"><span role="rowheader">Benchmarks</span></div>
                {benchmarkRows.length === 0 && (
                  <div className="cmp-row"><div className="cmp-label">Results</div><div className="cmp-cell text-[13px] text-muted-foreground" style={{ gridColumn: `span ${cols}` }}>No published benchmark results recorded for these models.</div></div>
                )}
                {benchmarkRows.filter((row) => !diffOnly || row.results.filter(Boolean).length >= 1).map(({ definition, results }) => {
                  const numbers = results.map((result) => result?.score ?? null);
                  const valid = numbers.filter((value): value is number => value !== null);
                  const top = valid.length >= 2 ? (definition!.higherIsBetter ? Math.max(...valid) : Math.min(...valid)) : null;
                  return (
                    <div key={definition!.id} className="cmp-row" role="row">
                      <div className="cmp-label" role="rowheader">{definition!.name}<SourceMark note={definition!.description} /></div>
                      {results.map((result, index) => (
                        <div key={models[index].slug} className="cmp-cell" role="cell">
                          {result ? (
                            <>
                              <span className={cn(top !== null && result.score === top && "font-semibold")}>{result.display ?? `${result.score}${definition!.unit === "%" ? "%" : ""}`}</span>
                              <span className={result.reportedBy === "independent" ? "badge badge-new !h-5 !text-[10.5px]" : "badge !h-5 !text-[10.5px]"}>{result.reportedBy === "independent" ? "Indep." : "Provider"}</span>
                              <SourceMark source={result.source} note={[result.version, result.conditions, `Evaluated ${formatDate(result.evaluatedAt)}`].filter(Boolean).join(" · ")} />
                            </>
                          ) : <span className="unknown text-[13px]">No result</span>}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            &ldquo;Lowest&rdquo; and &ldquo;Largest&rdquo; mark objective numeric extremes only (published price, context, output). Benchmarks differ in conditions and reporter; bold marks the highest published number, not a winner.
            Statuses: {models.map((model) => `${model.name} — ${statusLabels[model.status]}`).join("; ")}.
          </p>
        </div>
      </div>

      {shared.length > 0 && (
        <section className="container-page mt-12" aria-labelledby="bench-charts">
          <h2 id="bench-charts" className="text-xl">Benchmark charts</h2>
          <p className="mt-1 text-[14px] text-muted-foreground">Only benchmarks with published results for at least two of these models.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {shared.map(({ definition, results }) => {
              const data: BenchmarkDatum[] = results.flatMap((result, index) => result ? [{
                label: models[index].name,
                score: result.score,
                display: result.display ?? `${result.score}%`,
                reportedBy: result.reportedBy,
                color: providerMap.get(models[index].providerId)?.color ?? "#71717a",
                date: formatDate(result.evaluatedAt),
                source: result.source.label,
                conditions: result.conditions,
                version: result.version,
              }] : []);
              return (
                <div key={definition!.id} className="panel p-4">
                  <h3 className="text-[15px]">{definition!.name}</h3>
                  <p className="mb-2 text-xs text-muted-foreground">{definition!.description}</p>
                  <LazyBenchmarkChart data={data} unit="%" maxValue={100} />
                </div>
              );
            })}
          </div>
          <div className="mt-3"><BenchmarkLegend /></div>
        </section>
      )}

      <section id="calculator" className="container-page mt-12 scroll-mt-[120px]" aria-labelledby="calc-h">
        <h2 id="calc-h" className="mb-4 text-xl">API cost calculator</h2>
        <CostCalculator models={summaries} title="Estimated cost for your workload" source="comparison" />
      </section>
    </div>
  );
}
