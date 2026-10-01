"use client";

import Link from "next/link";
import { Bell, Heart, X } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { ModelCard } from "@/components/model-card";
import { EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { comparisonPath, eventTypeLabels, formatDate, providerPath, type FeedEvent } from "@/lib/catalog";

export function FavoritesView() {
  const { favorites, modelBySlug, setSelected } = useApp();
  const models = favorites.flatMap((entry) => modelBySlug.get(entry.slug) ?? []);
  if (!models.length) {
    return (
      <EmptyState icon={<Heart size={20} />} title="No favorites yet" description="Tap the heart on any model to save it here. Favorites are stored in this browser; accounts will sync them across devices.">
        <Button asChild><Link href="/models">Browse models</Link></Button>
      </EmptyState>
    );
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm"><strong>{models.length}</strong> <span className="text-muted-foreground">saved {models.length === 1 ? "model" : "models"}</span></p>
        {models.length >= 2 && (
          <Button variant="outline" asChild>
            <Link href={comparisonPath(models.slice(0, 4).map((model) => model.slug))} onClick={() => setSelected(models.slice(0, 4).map((model) => model.slug))}>
              Compare {Math.min(models.length, 4)} favorites
            </Link>
          </Button>
        )}
      </div>
      <div className="model-grid">{models.map((model) => <ModelCard key={model.slug} model={model} />)}</div>
    </div>
  );
}

export function WatchlistView({ events }: { events: FeedEvent[] }) {
  const { watchlist, modelBySlug, providerById, toggleWatch, markWatchSeen } = useApp();
  if (!watchlist.length) {
    return (
      <EmptyState icon={<Bell size={20} />} title="You're not following anything yet" description="Follow a model or provider to collect its pricing changes, new versions, and deprecations here. Email alerts arrive with accounts.">
        <Button asChild><Link href="/providers">Browse providers</Link></Button>
        <Button asChild variant="outline"><Link href="/models">Browse models</Link></Button>
      </EmptyState>
    );
  }

  const relevant = events.filter((event) => watchlist.some((entry) =>
    (entry.type === "model" && entry.id === event.modelSlug) || (entry.type === "provider" && entry.id === event.providerId)));
  const lastSeen = watchlist.reduce((min, entry) => (entry.seenAt < min ? entry.seenAt : min), watchlist[0].seenAt);
  const unseen = relevant.filter((event) => event.date > lastSeen.slice(0, 10)).length;

  return (
    <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside>
        <h2 className="mb-3 text-[15px]">Following ({watchlist.length})</h2>
        <ul className="divide-y rounded-lg border bg-card">
          {watchlist.map((entry) => {
            const model = entry.type === "model" ? modelBySlug.get(entry.id) : null;
            const provider = entry.type === "provider" ? providerById.get(entry.id) : model ? providerById.get(model.providerId) : null;
            const label = model?.name ?? provider?.name ?? entry.id;
            const href = model ? model.path : provider ? providerPath(provider.slug) : "#";
            return (
              <li key={`${entry.type}-${entry.id}`} className="flex items-center gap-3 px-3 py-2.5">
                {provider && <ProviderLogo provider={provider} size={26} />}
                <div className="min-w-0 flex-1">
                  <Link href={href} className="block truncate text-[14px] font-medium hover:underline">{label}</Link>
                  <p className="text-xs text-muted-foreground">{entry.type === "model" ? "Model" : "Provider"} · {entry.alerts.join(", ")}</p>
                </div>
                <button type="button" className="icon-btn !size-8" onClick={() => toggleWatch(entry.type, entry.id)} aria-label={`Stop following ${label}`}><X size={14} /></button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Saved in this browser. When accounts launch, you can opt in to email alerts for these changes.</p>
      </aside>
      <section aria-labelledby="updates">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="updates" className="text-[15px]">Updates {unseen > 0 && <span className="badge badge-new ml-1">{unseen} new</span>}</h2>
          {unseen > 0 && <Button size="sm" variant="outline" onClick={markWatchSeen}>Mark all as seen</Button>}
        </div>
        {relevant.length ? (
          <ul className="grid gap-2">
            {relevant.slice(0, 60).map((event) => (
              <li key={event.id} className="feed-entry !grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="text-[14px]"><Link href={event.modelPath} className="font-medium hover:underline">{event.modelName}</Link> <span className="badge ml-1">{eventTypeLabels[event.type]}</span>{event.date > lastSeen.slice(0, 10) && <span className="badge badge-new ml-1">New</span>}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{event.description}</p>
                </div>
                <time className="text-xs text-muted-foreground tabular" dateTime={event.date}>{formatDate(event.date, "short")}</time>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No recorded changes for what you follow yet.</p>}
      </section>
    </div>
  );
}
