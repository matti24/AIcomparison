import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreModels } from "@/components/explore";
import { PageHeader } from "@/components/ui-kit";
import { parseExploreState } from "@/lib/catalog";
import { getPageSummaries } from "@/lib/server-catalog";
import { MODEL_CATEGORIES } from "@/lib/types";

export async function generateMetadata({ searchParams }: PageProps<"/models">): Promise<Metadata> {
  const params = await searchParams;
  const filtered = Object.keys(params).length > 0;
  return {
    title: "Explore AI Models — Filter by Price, Context, Modality & Provider",
    description: "Browse and filter every AI model in the catalog by provider, category, API availability, modality, status, price, and context window.",
    alternates: { canonical: "/models" },
    // Filtered permutations stay crawlable for links but are not indexed as separate pages.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function ModelsPage({ searchParams }: PageProps<"/models">) {
  const [params, { models, providers }] = await Promise.all([searchParams, getPageSummaries()]);
  const search = new URLSearchParams(Object.entries(params).flatMap(([key, value]) => typeof value === "string" ? [[key, value]] : []));
  const state = parseExploreState(search, MODEL_CATEGORIES, providers.map((provider) => provider.id));

  return (
    <>
      <PageHeader
        title="Explore AI Models"
        description={`${models.length} models from ${providers.length} providers. Filter by what matters — every value links to its source on the model page.`}
        breadcrumbs={[{ href: "/models", label: "Models" }]}
      />
      <div className="container-page py-8">
        <Suspense>
          <ExploreModels initialState={state} />
        </Suspense>
      </div>
    </>
  );
}
