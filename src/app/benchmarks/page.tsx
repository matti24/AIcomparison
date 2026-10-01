import type { Metadata } from "next";
import { BenchmarkExplorer, type BenchmarkRow } from "@/components/benchmark-explorer";
import { PageHeader } from "@/components/ui-kit";
import { getProvider, modelPath } from "@/lib/catalog";
import { getPageCatalog } from "@/lib/server-catalog";

export const metadata: Metadata = {
  title: "AI Benchmarks — SWE-bench, GPQA, HLE, MMLU-Pro and more",
  description: "Explore published AI benchmark results with their version, conditions, date, and source. Independent and provider-reported results are labeled separately.",
  alternates: { canonical: "/benchmarks" },
};

export default async function BenchmarksPage() {
  const catalog = await getPageCatalog();
  const results: Record<string, BenchmarkRow[]> = {};
  for (const model of catalog.models) {
    const provider = getProvider(catalog, model.providerId);
    for (const result of model.benchmarks) {
      const definition = catalog.benchmarks.find((entry) => entry.id === result.benchmarkId);
      (results[result.benchmarkId] ??= []).push({
        modelSlug: model.slug,
        modelName: model.name,
        modelPath: modelPath(provider.slug, model.slug),
        providerId: model.providerId,
        score: result.score,
        display: result.display ?? `${result.score}${definition?.unit === "%" ? "%" : ""}`,
        reportedBy: result.reportedBy,
        version: result.version,
        conditions: result.conditions,
        date: result.evaluatedAt,
        sourceLabel: result.source.label,
        sourceUrl: result.source.url,
      });
    }
  }
  const benchmarks = [...catalog.benchmarks].sort((a, b) => (results[b.id]?.length ?? 0) - (results[a.id]?.length ?? 0));
  const total = Object.values(results).reduce((sum, rows) => sum + rows.length, 0);

  return (
    <>
      <PageHeader
        eyebrow="Benchmark database"
        title="AI benchmarks"
        description={`${total} published results across ${Object.keys(results).length} benchmarks. Each result keeps its version, test conditions, date, reporter, and source.`}
        breadcrumbs={[{ href: "/benchmarks", label: "Benchmarks" }]}
      />
      <div className="container-page py-8">
        <BenchmarkExplorer benchmarks={benchmarks} results={results} />
      </div>
    </>
  );
}
