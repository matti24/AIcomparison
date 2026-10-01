import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui-kit";
import { catalogEvents, eventTypeLabels, formatDate } from "@/lib/catalog";
import { getPageCatalog, getPageDate } from "@/lib/server-catalog";

export const metadata: Metadata = { title: "Changelog — Site and data updates", description: "What changed on AI Compare: new models, data corrections, pricing updates, and product features.", alternates: { canonical: "/changelog" } };

export default async function ChangelogPage() {
  const catalog = await getPageCatalog();
  const entries = [...catalog.changelog].sort((a, b) => b.date.localeCompare(a.date));
  const recentData = catalogEvents(catalog, getPageDate()).slice(0, 12);
  return (
    <>
      <PageHeader title="Changelog" description="Product releases and data updates. Model-level events live in the release feed." breadcrumbs={[{ href: "/changelog", label: "Changelog" }]} />
      <div className="container-narrow py-10">
        <ol className="timeline">
          {entries.map((entry) => (
            <li key={entry.id} className="timeline-item">
              <time className="text-right text-[13px] text-muted-foreground tabular" dateTime={entry.date}>{formatDate(entry.date, "short")}</time>
              <span className="timeline-dot" aria-hidden="true" />
              <div>
                <p className="font-semibold">{entry.title} <span className="badge ml-1 align-middle">{entry.kind === "data" ? "Data" : "Product"}</span></p>
                <p className="mt-1 text-[14px] text-muted-foreground">{entry.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <h2 className="mt-12 mb-3 text-xl">Latest model events</h2>
        <ul className="divide-y rounded-lg border bg-card">
          {recentData.map((event) => (
            <li key={event.id} className="flex items-baseline gap-3 px-4 py-2.5 text-[14px]">
              <time className="w-24 shrink-0 text-xs text-muted-foreground tabular" dateTime={event.date}>{formatDate(event.date, "short")}</time>
              <span className="min-w-0 flex-1 truncate"><Link href={event.modelPath} className="font-medium hover:underline">{event.modelName}</Link> <span className="text-muted-foreground">— {eventTypeLabels[event.type]}</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm"><Link href="/releases" className="text-link">Full release feed</Link></p>
      </div>
    </>
  );
}
