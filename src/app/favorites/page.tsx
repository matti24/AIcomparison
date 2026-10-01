import type { Metadata } from "next";
import { FavoritesView } from "@/components/personal-views";
import { PageHeader } from "@/components/ui-kit";

export const metadata: Metadata = {
  title: "Your favorite AI models",
  robots: { index: false, follow: true },
  alternates: { canonical: "/favorites" },
};

export default function FavoritesPage() {
  return (
    <>
      <PageHeader title="Favorites" description="Models you've saved on this device." breadcrumbs={[{ href: "/favorites", label: "Favorites" }]} />
      <div className="container-page py-8"><FavoritesView /></div>
    </>
  );
}
