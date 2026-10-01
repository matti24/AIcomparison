"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { defaultWorkload, estimateCost, formatDate, formatPrice, formatUsd, type ModelSummary, type Workload } from "@/lib/catalog";
import { track } from "@/lib/analytics";

const PRESETS: { label: string; workload: Workload }[] = [
  { label: "Chatbot", workload: { inputTokens: 1_500, outputTokens: 400, requestsPerDay: 2_000, cachedShare: 0 } },
  { label: "RAG / docs Q&A", workload: { inputTokens: 8_000, outputTokens: 500, requestsPerDay: 1_000, cachedShare: 0.5 } },
  { label: "Coding agent", workload: { inputTokens: 40_000, outputTokens: 4_000, requestsPerDay: 300, cachedShare: 0.7 } },
  { label: "Batch classification", workload: { inputTokens: 600, outputTokens: 20, requestsPerDay: 50_000, cachedShare: 0 } },
];

function NumberField({ id, label, value, onChange, min = 0, max, step = 1, suffix }: {
  id: string; label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          className="field tabular pr-14"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Number.isFinite(next) ? Math.min(Math.max(next, min), max ?? Number.MAX_SAFE_INTEGER) : 0);
          }}
        />
        {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

export function CostCalculator({ models, title = "API cost calculator", compact = false, source = "calculator" }: { models: ModelSummary[]; title?: string; compact?: boolean; source?: string }) {
  const { providerById } = useApp();
  const [workload, setWorkload] = useState<Workload>(defaultWorkload);
  const touched = useRef(false);
  const set = (patch: Partial<Workload>) => { touched.current = true; setWorkload((current) => ({ ...current, ...patch })); };

  useEffect(() => {
    if (!touched.current) return;
    const timer = setTimeout(() => track("calculator_used", { surface: source, models: models.length }), 1500);
    return () => clearTimeout(timer);
  }, [workload, source, models.length]);

  const rows = useMemo(() => models.map((model) => ({ model, cost: estimateCost(model, workload) })), [models, workload]);
  const priced = rows.filter((row) => row.cost !== null);
  const max = Math.max(...priced.map((row) => row.cost!.perMonth), 0);
  const min = priced.length > 1 ? Math.min(...priced.map((row) => row.cost!.perMonth)) : null;
  const latest = models.map((model) => model.priceCheckedAt).filter(Boolean).sort().at(-1) ?? null;
  const monthlyRequests = workload.requestsPerDay * 30;

  return (
    <div className="panel overflow-hidden">
      <div className="border-b p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[16px] font-semibold">{title}</h3>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Workload presets">
            {PRESETS.map((preset) => (
              <button key={preset.label} type="button" className="chip !h-7 !text-[12.5px]" onClick={() => set(preset.workload)}>{preset.label}</button>
            ))}
          </div>
        </div>
        <div className={`mt-4 grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
          <NumberField id={`${source}-in`} label="Input tokens / request" value={workload.inputTokens} onChange={(value) => set({ inputTokens: value })} step={100} max={10_000_000} />
          <NumberField id={`${source}-out`} label="Output tokens / request" value={workload.outputTokens} onChange={(value) => set({ outputTokens: value })} step={50} max={2_000_000} />
          <NumberField id={`${source}-rpd`} label="Requests / day" value={workload.requestsPerDay} onChange={(value) => set({ requestsPerDay: value })} step={100} max={100_000_000} />
          <NumberField id={`${source}-cache`} label="Cached input share" value={Math.round(workload.cachedShare * 100)} onChange={(value) => set({ cachedShare: value / 100 })} max={100} step={5} suffix="%" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <caption className="sr-only">Estimated API cost for {monthlyRequests.toLocaleString("en-US")} requests per month</caption>
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col" className="num">Per request</th>
              <th scope="col" className="num">Per day</th>
              <th scope="col" className="num">Per month</th>
              {!compact && <th scope="col" className="w-[28%]"><span className="sr-only">Relative monthly cost</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ model, cost }) => {
              const provider = providerById.get(model.providerId);
              return (
                <tr key={model.slug}>
                  <th scope="row" className="font-normal">
                    <span className="flex items-center gap-2">
                      {provider && <ProviderLogo provider={provider} size={22} />}
                      <span className="font-medium">{model.name}</span>
                      {cost && min !== null && cost.perMonth === min && <span className="cmp-best">Lowest</span>}
                    </span>
                    <span className="mt-0.5 block pl-[30px] text-xs text-muted-foreground tabular">
                      {model.input !== null ? `${formatPrice(model.input)} in · ${model.cachedInput !== null ? `${formatPrice(model.cachedInput)} cached · ` : ""}${formatPrice(model.output)} out /1M` : model.otherPrice ? "Non-token pricing" : "Price not disclosed"}
                    </span>
                  </th>
                  {cost ? (
                    <>
                      <td className="num">{formatUsd(cost.perRequest)}</td>
                      <td className="num">{formatUsd(cost.perDay)}</td>
                      <td className="num font-semibold">{formatUsd(cost.perMonth)}{cost.usedCachedFallback && <span className="ml-1 text-xs font-normal text-muted-foreground" title="No published cached-input rate; standard input rate used">*</span>}</td>
                      {!compact && (
                        <td>
                          <div className="h-2 rounded-full bg-surface-2" aria-hidden="true">
                            <div className="h-2 rounded-full bg-foreground/70" style={{ width: `${max ? Math.max(2, (cost.perMonth / max) * 100) : 0}%` }} />
                          </div>
                        </td>
                      )}
                    </>
                  ) : (
                    <td colSpan={compact ? 3 : 4} className="text-[13px] text-muted-foreground">
                      {model.otherPrice ?? "No published per-token price to calculate with."}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-start gap-2 border-t bg-surface px-5 py-3 text-xs text-muted-foreground">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          {monthlyRequests.toLocaleString("en-US")} requests/month (30 days). Standard published rates; excludes taxes, tool fees, long-context or priority tiers, and batch discounts.
          Reasoning models may bill hidden reasoning tokens as output. {latest && <>Pricing last verified: {formatDate(latest)}.</>}
          {rows.some((row) => row.cost?.usedCachedFallback) && " * No published cached rate — standard input rate used."}
        </p>
      </div>
    </div>
  );
}
