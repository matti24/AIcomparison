"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { ProviderLogo } from "@/components/brand";
import { WatchButton } from "@/components/model-card";
import { daysBetween, eventTypeLabels, formatDate, providerPath, type FeedEvent } from "@/lib/catalog";
import { EVENT_TYPES, type ModelEventType } from "@/lib/types";

function groupLabel(date: string, referenceDate: string) {
  const days = daysBetween(date, referenceDate.slice(0, 10));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

const PAGE = 80;

export function ReleaseFeed({ events }: { events: FeedEvent[] }) {
  const { providerById, referenceDate } = useApp();
  const [types, setTypes] = useState<ModelEventType[]>([]);
  const [provider, setProvider] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => events.filter((event) => (!types.length || types.includes(event.type)) && (!provider || event.providerId === provider)), [events, types, provider]);
  const groups = useMemo(() => {
    const map = new Map<string, FeedEvent[]>();
    for (const event of filtered.slice(0, limit)) {
      const label = groupLabel(event.date, referenceDate);
      map.set(label, [...(map.get(label) ?? []), event]);
    }
    return [...map.entries()];
  }, [filtered, limit, referenceDate]);
  const providerOptions = [...new Set(events.map((event) => event.providerId))].map((id) => providerById.get(id)).filter(Boolean).sort((a, b) => a!.name.localeCompare(b!.name));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Event types">
          <button type="button" className="chip" aria-pressed={types.length === 0} onClick={() => setTypes([])}>All</button>
          {EVENT_TYPES.map((type) => (
            <button key={type} type="button" className="chip" aria-pressed={types.includes(type)} onClick={() => setTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type])}>
              {eventTypeLabels[type]}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="feed-provider">Provider</label>
        <select id="feed-provider" className="field !h-8 !w-auto !text-[13px] sm:ml-auto" value={provider} onChange={(event) => setProvider(event.target.value)}>
          <option value="">All providers</option>
          {providerOptions.map((entry) => <option key={entry!.id} value={entry!.id}>{entry!.name}</option>)}
        </select>
      </div>

      {provider && <div className="mb-4"><WatchButton type="provider" id={provider} name={providerById.get(provider)?.name ?? provider} /></div>}

      {groups.length === 0 && <p className="text-sm text-muted-foreground">No events match these filters.</p>}
      {groups.map(([label, list]) => (
        <section key={label} className="feed-day" aria-label={label}>
          <h2>{label} <span className="font-normal normal-case tracking-normal tabular">· {list.length}</span></h2>
          <ol>
            {list.map((event) => {
              const entryProvider = providerById.get(event.providerId);
              return (
                <li key={event.id} className="feed-entry">
                  {entryProvider ? <Link href={providerPath(entryProvider.slug)} aria-label={entryProvider.name}><ProviderLogo provider={entryProvider} size={28} /></Link> : <span />}
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
                      <Link href={event.modelPath} className="font-semibold hover:underline">{event.modelName}</Link>
                      <span className={`badge ${event.type === "release" ? "badge-new" : event.type === "deprecation" ? "badge-deprecated" : event.type === "retirement" ? "badge-retired" : ""}`}>{eventTypeLabels[event.type]}</span>
                    </p>
                    <p className="mt-0.5 text-[13.5px] text-secondary-foreground">{event.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{event.description}</p>
                    <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-subtle hover:text-foreground"><ExternalLink size={11} aria-hidden="true" /> {event.sourceLabel}</a>
                  </div>
                  <time className="mono text-xs text-muted-foreground" dateTime={event.date}>{formatDate(event.date, "short")}</time>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {filtered.length > limit && (
        <div className="mt-6 flex justify-center">
          <button type="button" className="chip" onClick={() => setLimit((value) => value + PAGE)}>Load older events ({filtered.length - limit})</button>
        </div>
      )}
    </div>
  );
}
