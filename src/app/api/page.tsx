import type { Metadata } from "next";
import { Braces, Clock, Database, LineChart, Tags, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui-kit";
import { WaitlistForm } from "@/components/waitlist";
import { catalogStats } from "@/lib/catalog";
import { getPageCatalog } from "@/lib/server-catalog";

export const metadata: Metadata = {
  title: "AI Model Data API — Pricing, Capabilities, Releases",
  description: "Structured, source-linked AI model data for your product: metadata, pricing, capabilities, release history, deprecations, and benchmarks. Join the waitlist.",
  alternates: { canonical: "/api" },
};

const offerings = [
  { icon: Database, title: "Model metadata", text: "Providers, families, versions, categories, modalities, context windows, and licenses." },
  { icon: Tags, title: "Pricing", text: "Input, cached-input, and output prices plus non-token pricing, each with a source and verification date." },
  { icon: Braces, title: "Capabilities", text: "Tool calling, structured output, reasoning, computer use, realtime, and more — with unknowns kept explicit." },
  { icon: Clock, title: "Release history", text: "Dated launches, updates, pricing changes, and new API features." },
  { icon: TriangleAlert, title: "Deprecations", text: "Deprecation and retirement dates so you can plan migrations." },
  { icon: LineChart, title: "Benchmarks", text: "Published results with version, conditions, reporter, and source — never blended scores." },
];

export default async function DataApiPage() {
  const stats = catalogStats(await getPageCatalog());
  return (
    <>
      <PageHeader eyebrow="Coming soon" title="AI model data for your product" description={`The same structured data behind AI Compare — ${stats.models} models, ${stats.providers} providers, ${stats.sources.toLocaleString("en-US")} cited sources — as a JSON API.`} breadcrumbs={[{ href: "/api", label: "Data API" }]} />
      <div className="container-page py-10">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map(({ icon: Icon, title, text }) => (
            <li key={title} className="panel p-5">
              <Icon size={18} className="text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-3 text-[16px]">{title}</h2>
              <p className="mt-1 text-[14px] text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
        <section className="panel mt-10 grid gap-6 p-6 md:grid-cols-2 md:items-center md:p-8" aria-labelledby="api-waitlist">
          <div>
            <h2 id="api-waitlist" className="text-xl">Join the API waitlist</h2>
            <p className="mt-1.5 text-[14.5px] text-muted-foreground">Tell us you&apos;re interested and we&apos;ll reach out with early access and pricing. No commitment.</p>
          </div>
          <WaitlistForm list="api-waitlist" source="api-page" />
        </section>
        <pre className="mono mt-10 overflow-x-auto rounded-lg border bg-surface p-5 text-[12.5px] leading-relaxed text-secondary-foreground" aria-label="Example response">{`GET /v1/models/claude-opus-5-5

{
  "id": "claude-opus-5-5",
  "provider": "anthropic",
  "status": "active",
  "context_window": { "value": 1000000, "source": "https://…", "verified_at": "2026-10-01" },
  "pricing": { "input_per_1m": { "value": …, "currency": "USD", "source": "https://…" } },
  "capabilities": { "tool_calling": true, "computer_use": true, … }
}`}</pre>
        <p className="mt-2 text-xs text-muted-foreground">Illustrative shape only; the API is not live yet.</p>
      </div>
    </>
  );
}
