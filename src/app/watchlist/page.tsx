import type { Metadata } from "next";
import { WatchlistView } from "@/components/personal-views";
import { PageHeader } from "@/components/ui-kit";
import { catalogEvents } from "@/lib/catalog";
import { getPageCatalog, getPageDate } from "@/lib/server-catalog";

export const metadata: Metadata = {
  title: "Watchlist — Model and provider updates",
  robots: { index: false, follow: true },
  alternates: { canonical: "/watchlist" },
};

export default async function WatchlistPage() {
  const events = catalogEvents(await getPageCatalog(), getPageDate());
  return (
    <>
      <PageHeader title="Watchlist" description="Pricing changes, new versions, and deprecations for the models and providers you follow." breadcrumbs={[{ href: "/watchlist", label: "Watchlist" }]} />
      <div className="container-page py-8"><WatchlistView events={events} /></div>
    </>
  );
}
