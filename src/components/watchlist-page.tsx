"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bell, Clock3, ExternalLink, Heart, Info, Star } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { ModelCard } from "@/components/model-card";
import { PageHeading } from "@/components/page-heading";
import { EmptyState } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { formatDate, getProvider } from "@/lib/catalog";

export function WatchlistPage() {
  const { catalog, referenceDate, favorites, recent, toggleFavorite } = useApp();
  const [tab, setTab] = useState<"models" | "updates">("models");
  const models = favorites.flatMap((entry) => catalog.models.filter((model) => model.slug === entry.slug));
  const missing = favorites.filter((entry) => !catalog.models.some((model) => model.slug === entry.slug));
  const updates = models.flatMap((model) => model.releases.map((release) => ({
    model, release, isNew: new Date(release.date).getTime() > new Date(favorites.find((entry) => entry.slug === model.slug)?.seenAt ?? referenceDate).getTime(),
  }))).sort((a, b) => b.release.date.localeCompare(a.release.date));
  const newCount = updates.filter((update) => update.isNew).length;
  const recentModels = recent.flatMap((slug) => catalog.models.filter((model) => model.slug === slug)).slice(0, 3);
  return (
    <div className="content-width pb-14">
      <PageHeading eyebrow="Your corner of the AI world" title="Good finds. All in one place." description="Keep the models you're curious about close by. Follow their documented releases, pricing changes, and capability updates."><span className="tag tag-purple !px-3 !py-2"><Heart size={12} />{models.length} saved {models.length === 1 ? "model" : "models"}</span></PageHeading>
      <div className="notice mb-7"><Info size={16} /><p>Your watchlist and recently viewed models are saved on this browser. No account, tracking, or email notifications. Updates appear here when an editor adds source-backed events to the catalog.</p></div>
      {missing.length > 0 && <div className="notice mb-5"><Info size={15} /><div><p>Some saved models are no longer in this catalog.</p>{missing.map((entry) => <button key={entry.slug} onClick={() => toggleFavorite(entry.slug)} className="mr-4 text-primary underline">Remove {entry.slug}</button>)}</div></div>}
      {models.length ? <>
        <div className="model-tabs" role="tablist" aria-label="Watchlist views"><button className="model-tab" id="saved-models-tab" role="tab" aria-controls="watchlist-results" aria-selected={tab === "models"} onClick={() => setTab("models")}><Star size={12} />Saved models</button><button className="model-tab" id="saved-updates-tab" role="tab" aria-controls="watchlist-results" aria-selected={tab === "updates"} onClick={() => setTab("updates")}><Bell size={12} />Release & update history{newCount > 0 && <span className="tag tag-purple">{newCount} new</span>}</button></div>
        <div id="watchlist-results" role="tabpanel" aria-labelledby={tab === "models" ? "saved-models-tab" : "saved-updates-tab"}>
          {tab === "models" ? <div className="model-grid">{models.map((model) => <ModelCard key={model.id} model={model} />)}</div> :
            updates.length ? <div className="watchlist-updates">{updates.map(({ model, release, isNew }) => <article className="watchlist-update" key={`${model.id}-${release.id}`}><ProviderLogo provider={getProvider(catalog, model.providerId)} size={43} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Link href={`/models/${model.slug}`} className="text-xs font-semibold hover:text-primary">{model.name}</Link><span className="tag">{release.type}</span>{isNew && <span className="tag tag-purple">New since your last visit</span>}</div><h2>{release.title}</h2><p>{release.description}</p><a href={release.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary">View source<ExternalLink size={10} /></a></div><time dateTime={release.date}>{formatDate(release.date)}</time></article>)}</div> :
              <EmptyState icon="check" title="Your models are on the radar." description="No verified release events have been recorded for these models yet. New events will appear here when added to the catalog." />}
        </div>
      </> : <EmptyState icon="heart" title="Your next favorite is out there." description="Tap the star on any model to add it here. Build a personal shortlist, compare your favorites, and keep an eye on what changes."><Button asChild size="lg"><Link href="/models">Find some favorites <ArrowRight size={14} /></Link></Button></EmptyState>}
      {recentModels.length > 0 && <section className="section !pb-0"><div className="section-heading"><div><h2 className="flex items-center gap-2"><Clock3 size={21} className="text-primary" />Recently on your radar.</h2><p>Pick up where you left off.</p></div></div><div className="model-grid">{recentModels.map((model) => <ModelCard key={model.id} model={model} />)}</div></section>}
    </div>
  );
}
