import type { Metadata } from "next";
import { NewsletterCard } from "@/components/newsletter";
import { ReleaseFeed } from "@/components/release-feed";
import { PageHeader } from "@/components/ui-kit";
import { catalogEvents } from "@/lib/catalog";
import { getPageCatalog, getPageDate } from "@/lib/server-catalog";

export const metadata: Metadata = {
  title: "AI Model Releases & Updates — Launches, Pricing Changes, Deprecations",
  description: "A dated feed of new AI models, model updates, pricing changes, new API features, and deprecations across all providers — each linked to the official announcement.",
  alternates: { canonical: "/releases" },
};

export default async function ReleasesPage() {
  const events = catalogEvents(await getPageCatalog(), getPageDate());
  return (
    <>
      <PageHeader
        eyebrow="Release feed"
        title="AI model releases & updates"
        description={`${events.length} dated events from official announcements, model pages, and deprecation notices. Follow a provider to collect its updates in your watchlist.`}
        breadcrumbs={[{ href: "/releases", label: "Releases" }]}
      />
      <div className="container-page py-8">
        <ReleaseFeed events={events} />
        <div className="mt-14"><NewsletterCard source="releases" title="Get releases in your inbox" description="The week's important launches, price changes, and deprecations — once a week." /></div>
      </div>
    </>
  );
}
