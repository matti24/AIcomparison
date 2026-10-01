"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ModelCard } from "@/components/model-card";
import { EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  FINDER_API, FINDER_BUDGET, FINDER_PRIORITIES, FINDER_TASKS, recommendModels,
  type FinderAnswers, type FinderApi, type FinderBudget, type FinderPriority, type FinderTask,
} from "@/lib/catalog";
import { track } from "@/lib/analytics";

const STEPS = [
  { key: "task", title: "What are you doing?", options: FINDER_TASKS },
  { key: "priority", title: "What matters most?", options: FINDER_PRIORITIES },
  { key: "api", title: "Do you need an API?", options: FINDER_API },
  { key: "budget", title: "What's your budget?", options: FINDER_BUDGET },
] as const;

const BUDGET_HELP: Record<FinderBudget, string> = {
  free: "Free access or downloadable weights",
  low: "Up to $1 per 1M input tokens",
  medium: "Up to $5 per 1M input tokens",
  premium: "Any price",
  any: "Don't filter by price",
};

export function AiFinder() {
  const { models } = useApp();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<FinderAnswers>>({});
  const done = step >= STEPS.length;
  const complete = answers.task && answers.priority && answers.api && answers.budget;
  const result = done && complete ? recommendModels(models, answers as FinderAnswers) : null;

  function choose(key: (typeof STEPS)[number]["key"], value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (step === STEPS.length - 1) {
      track("finder_completed", { task: next.task ?? null, priority: next.priority ?? null, api: next.api ?? null, budget: next.budget ?? null });
    }
    setStep((current) => current + 1);
  }

  if (done && result) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl">{result.results.length ? `${result.results.length} models match your answers` : "No exact matches"}</h2>
            <p className="mt-1 text-[14px] text-muted-foreground">
              {FINDER_TASKS[answers.task as FinderTask]} · {FINDER_PRIORITIES[answers.priority as FinderPriority]} · API: {FINDER_API[answers.api as FinderApi]} · Budget: {FINDER_BUDGET[answers.budget as FinderBudget]}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(STEPS.length - 1)}><ArrowLeft size={15} /> Back</Button>
            <Button variant="outline" onClick={() => { setAnswers({}); setStep(0); }}><RotateCcw size={15} /> Start over</Button>
          </div>
        </div>
        {result.notes.map((note) => <p key={note} className="mt-4 rounded-lg border bg-surface px-4 py-3 text-[13.5px] text-muted-foreground">{note}</p>)}
        {result.results.length ? (
          <div className="model-grid mt-6">
            {result.results.map(({ model, reasons }) => (
              <ModelCard
                key={model.slug}
                model={model}
                reason={
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Why it matches</p>
                    <ul className="mt-1.5 grid gap-1">
                      {reasons.map((reason) => <li key={reason} className="flex gap-1.5 text-[13.5px]"><Check size={14} className="mt-0.5 shrink-0 text-positive" aria-hidden="true" />{reason}</li>)}
                    </ul>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState title="Nothing matches all of your answers." description="Try a different budget or priority — some combinations (for example free + realtime voice) are rare.">
              <Button variant="outline" onClick={() => setStep(1)}>Change priority</Button>
              <Button variant="outline" onClick={() => setStep(3)}>Change budget</Button>
            </EmptyState>
          </div>
        )}
        <p className="mt-6 text-xs text-muted-foreground">Matches are rule-based filters over documented specifications. They are not claims that any model is objectively the best. Always test with your own prompts.</p>
      </div>
    );
  }

  const current = STEPS[step];
  return (
    <div>
      <ol className="mb-6 flex gap-2" aria-label="Progress">
        {STEPS.map((entry, index) => (
          <li key={entry.key} className="h-1.5 flex-1 rounded-full" style={{ background: index <= step ? "var(--foreground)" : "var(--border)" }} aria-current={index === step ? "step" : undefined}>
            <span className="sr-only">Step {index + 1}: {entry.title}{index < step ? " (done)" : ""}</span>
          </li>
        ))}
      </ol>
      <p className="text-[13px] font-medium text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
      <h2 className="mt-1 text-2xl" id="finder-question">{current.title}</h2>
      <div role="radiogroup" aria-labelledby="finder-question" className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(current.options).map(([value, label]) => {
          const selected = answers[current.key] === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(current.key, value)}
              className="flex min-h-14 items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:border-foreground aria-checked:border-foreground aria-checked:shadow-[0_0_0_1px_var(--foreground)]"
            >
              <span>
                <span className="block font-medium">{label}</span>
                {current.key === "budget" && <span className="text-[12.5px] text-muted-foreground">{BUDGET_HELP[value as FinderBudget]}</span>}
              </span>
              <ArrowRight size={15} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {step > 0 && <Button variant="ghost" className="mt-5" onClick={() => setStep(step - 1)}><ArrowLeft size={15} /> Back</Button>}
    </div>
  );
}
