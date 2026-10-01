"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { CostCalculator } from "@/components/cost-calculator";
import { sortModels } from "@/lib/catalog";

export function PricingCalculatorView({ initial }: { initial: string[] }) {
  const { models, providerById } = useApp();
  const priced = useMemo(() => sortModels(models.filter((model) => model.input !== null && model.output !== null && model.status !== "retired"), "name"), [models]);
  const [selected, setSelected] = useState<string[]>(initial);
  const chosen = selected.flatMap((slug) => priced.find((model) => model.slug === slug) ?? []);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {chosen.map((model) => (
          <span key={model.slug} className="chip">
            {model.name}
            <button type="button" className="-mr-1 grid size-5 place-items-center rounded hover:bg-surface-2" onClick={() => setSelected(selected.filter((slug) => slug !== model.slug))} aria-label={`Remove ${model.name}`}><X size={12} /></button>
          </span>
        ))}
        {chosen.length < 8 && (
          <>
            <label htmlFor="calc-add" className="sr-only">Add a model</label>
            <select id="calc-add" className="field !h-8 !w-auto max-w-full !text-[13px]" value="" onChange={(event) => event.target.value && setSelected([...selected, event.target.value])}>
              <option value="">+ Add model ({priced.length} with token pricing)</option>
              {priced.filter((model) => !selected.includes(model.slug)).map((model) => (
                <option key={model.slug} value={model.slug}>{model.name} — {providerById.get(model.providerId)?.name}</option>
              ))}
            </select>
          </>
        )}
      </div>
      {chosen.length ? <CostCalculator models={chosen} title="Estimated cost" source="pricing-calculator" /> : <p className="text-sm text-muted-foreground">Add a model to estimate costs.</p>}
    </div>
  );
}
