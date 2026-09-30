"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Bot, BriefcaseBusiness, ChartColumnIncreasing, Check, Code2, Coins, Database, FileText, Gauge, Globe2, GraduationCap, Image, KeyRound, Layers3, LockKeyhole, MessageCircle, RotateCcw, ShieldCheck, Sparkles, Video, Zap } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ModelCard } from "@/components/model-card";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { priorityLabels, recommendModels, useCaseLabels, type Priority } from "@/lib/catalog";
import type { UseCase } from "@/lib/types";
import { cn } from "@/lib/utils";

const useCases: { value: UseCase; icon: typeof Code2; description: string }[] = [
  { value: "coding", icon: Code2, description: "Ship, debug, and build things" },
  { value: "writing", icon: FileText, description: "Find the words that work" },
  { value: "research", icon: BookOpen, description: "Go deeper, connect the dots" },
  { value: "school", icon: GraduationCap, description: "Understand something new" },
  { value: "business", icon: BriefcaseBusiness, description: "A smarter working day" },
  { value: "data-analysis", icon: ChartColumnIncreasing, description: "Turn numbers into insight" },
  { value: "image-creation", icon: Image, description: "Bring an idea into focus" },
  { value: "video-creation", icon: Video, description: "Make your next moving story" },
  { value: "customer-support", icon: MessageCircle, description: "Give helpful answers, at scale" },
  { value: "agents", icon: Bot, description: "Make your workflows work" },
  { value: "general", icon: Sparkles, description: "A little help with everything" },
];

const priorities: { value: Priority; icon: typeof Code2; description: string }[] = [
  { value: "performance", icon: Gauge, description: "A strong fit for the task, not a universal score" },
  { value: "cheapest", icon: Coins, description: "The lowest documented API input price" },
  { value: "fastest", icon: Zap, description: "Speed documented by a reliable source" },
  { value: "context", icon: Database, description: "More room for long documents and inputs" },
  { value: "privacy", icon: LockKeyhole, description: "Run the model in your own environment" },
  { value: "open", icon: Globe2, description: "An open-source license, not just open weights" },
  { value: "api", icon: KeyRound, description: "A model you can build into your app" },
  { value: "multimodal", icon: Layers3, description: "Go beyond text with images, audio, or video" },
];

export function AIFinder() {
  const { catalog } = useApp();
  const [step, setStep] = useState(0);
  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const matches = useCase && priority ? recommendModels(catalog, useCase, priority) : [];

  function reset() { setStep(0); setUseCase(null); setPriority(null); }

  return (
    <div className="content-width pb-14">
      <PageHeading eyebrow="Your personal AI compass" title="The right AI starts with you." description="No one model is best at everything. Tell us a little about what you need, and we'll help you find a few good fits." />
      <div className={cn("finder-workspace", step === 2 && "finder-results")}>
        <ol className="finder-progress" aria-label="Finder progress">{["Your use case", "Your priorities", "Your matches"].map((label, index) => <li key={label} className={cn(step >= index && "active")} aria-current={step === index ? "step" : undefined}><span>{step > index ? <Check size={12} /> : `0${index + 1}`}</span>{label}{index < 2 && <div className="finder-progress-line" />}</li>)}</ol>
        {step < 2 ? (
          <section className="finder-question-panel">
            <div className="finder-question-heading"><span className="eyebrow">Question {step + 1} of 2</span><h2>{step === 0 ? "What do you mainly need AI for?" : "What matters most to you?"}</h2><p>{step === 0 ? "Start with the thing you spend your time on. Pick one for now." : `We'll look for models suited to ${useCase ? useCaseLabels[useCase].toLowerCase() : "your task"}, with this priority in mind.`}</p></div>
            <div className={cn("finder-options", step === 1 && "priority-options")} role="group" aria-label={step === 0 ? "Choose a use case" : "Choose your priority"}>
              {step === 0 ? useCases.map(({ value, icon: Icon, description }) => <button key={value} className={cn("finder-option", useCase === value && "selected")} aria-pressed={useCase === value} onClick={() => setUseCase(value)}><span className="finder-option-icon"><Icon size={20} strokeWidth={1.6} /></span><span><strong>{useCaseLabels[value]}</strong><small>{description}</small></span>{useCase === value && <Check size={14} className="finder-option-check" />}</button>) :
                priorities.map(({ value, icon: Icon, description }) => <button key={value} className={cn("finder-option", priority === value && "selected")} aria-pressed={priority === value} onClick={() => setPriority(value)}><span className="finder-option-icon"><Icon size={20} strokeWidth={1.6} /></span><span><strong>{priorityLabels[value]}</strong><small>{description}</small></span>{priority === value && <Check size={14} className="finder-option-check" />}</button>)}
            </div>
            <div className="finder-question-footer">{step > 0 ? <button className="text-link" onClick={() => setStep(0)}><ArrowLeft size={13} />Back to use case</button> : <p><ShieldCheck size={12} />No sign-up. No information leaves your browser.</p>}<Button size="lg" disabled={step === 0 ? useCase === null : priority === null} onClick={() => setStep(step + 1)}>{step === 0 ? "Next, your priorities" : "Find my matches"}<ArrowRight size={14} /></Button></div>
          </section>
        ) : (
          <>
            <div className="finder-results-heading"><div><span className="eyebrow">A shortlist, with reasons</span><h2>{matches.length ? "A few good fits. Here's why." : "No documented match. No guesswork."}</h2><p>For <strong>{useCase ? useCaseLabels[useCase] : ""}</strong>, prioritizing <strong>{priority ? priorityLabels[priority].toLowerCase() : ""}</strong>.</p></div><Button variant="outline" onClick={reset}><RotateCcw size={13} />Start again</Button></div>
            {matches.length ? <div className="finder-match-grid">{matches.map(({ model, reasons }) => <div className="finder-match" key={model.id}><div className="match-label"><Check size={11} />A documented match</div><ModelCard model={model} /><div className="match-reasons"><h3>Why this could work for you</h3><ul>{reasons.map((reason) => <li key={reason}><Check size={12} /><span>{reason}</span></li>)}</ul></div></div>)}</div> :
              <EmptyState title="Let's try a different direction." description={priority === "fastest" ? "We don't have source-verified speed data for models in this use case. Rather than guess, try API access, pricing, or context size." : "No model in the current catalog has documented support for this exact combination. Try another priority or use case."}><Button onClick={() => setStep(1)}><ArrowLeft size={14} />Change my priority</Button></EmptyState>}
            <div className="notice mt-7"><ShieldCheck size={16} /><p>These are rule-based matches from documented capabilities and editorial use-case tags, not an objective &ldquo;best AI&rdquo; ranking. Prices are sorted by input rate, not total workload cost. Verify your own requirements using a side-by-side comparison.</p></div>
          </>
        )}
      </div>
    </div>
  );
}
