"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Clock3, Info, Sparkles, TrendingUp } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ModelCard } from "@/components/model-card";
import { PageHeading } from "@/components/page-heading";
import { formatDate, sortModels } from "@/lib/catalog";

export function TrendingPage() {
  const { catalog } = useApp();
  const [tab, setTab] = useState<"trending" | "recent">("trending");
  const trending = sortModels(catalog.models.filter((model) => model.editorial.trending && model.status !== "deprecated"), "featured");
  const models = tab === "trending" ? trending : sortModels(catalog.models.filter((model) => model.releaseDate.value !== null), "recent").slice(0, 12);
  return (
    <div className="content-width pb-14">
      <PageHeading eyebrow="A signal, not more noise" title="Worth keeping an eye on." description="The models on our editorial radar, and the recent releases worth exploring. A little perspective on a fast-moving space." />
      <div className="trending-intro"><div className="trending-intro-icon"><TrendingUp size={30} strokeWidth={1.5} /></div><div className="flex-1"><span className="eyebrow">Human-curated. Clearly labeled.</span><h2>Interest is a signal. Not a score.</h2><p>These are editorial picks, not measured market share, search volume, or usage. Every choice comes with a reason. External trend signals can be added as reliable data becomes available.</p></div><Link href="/methodology" className="text-link">Our methodology <ArrowRight size={13} /></Link></div>
      <div className="model-tabs mt-8" role="tablist" aria-label="Trending collections"><button className="model-tab" id="trending-tab" role="tab" aria-selected={tab === "trending"} aria-controls="trending-results" onClick={() => setTab("trending")}><Sparkles size={13} />On our radar <span className="ml-1 text-[9px]">{trending.length}</span></button><button className="model-tab" id="recent-releases-tab" role="tab" aria-selected={tab === "recent"} aria-controls="trending-results" onClick={() => setTab("recent")}><Clock3 size={13} />Recently released</button></div>
      <div id="trending-results" role="tabpanel" aria-labelledby={tab === "trending" ? "trending-tab" : "recent-releases-tab"} className="model-grid">
        {models.map((model) => <div key={model.id} className="flex flex-col"><ModelCard model={model} showTrending={tab === "trending"} /><div className="trend-rationale"><span className="flex items-center gap-1.5 text-[9px] font-semibold text-primary">{tab === "trending" ? <><Sparkles size={10} />WHY IT&apos;S ON OUR RADAR</> : <><Clock3 size={10} />RELEASED {formatDate(model.releaseDate.value).toUpperCase()}</>}</span><p>{tab === "trending" ? model.editorial.rationale : model.releases.find((release) => release.type === "release")?.description ?? "Explore the model profile for documented release details."}</p><span className="mt-2 block text-[9px] text-muted-foreground">{tab === "trending" ? `Editorial selection updated ${formatDate(model.editorial.updatedAt, true)}` : "Ordered by documented release date"}</span></div></div>)}
      </div>
      <div className="notice mt-7"><Info size={15} /><p>Future trend sources may include GitHub activity, search interest, developer surveys, or API usage. We will label the source, observation period, and methodology. No such external metrics are represented here today.</p></div>
    </div>
  );
}
