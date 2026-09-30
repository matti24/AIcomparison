import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComparisonWorkspace } from "@/components/comparison-workspace";
import { getPageCatalog } from "@/lib/server-catalog";
import { resolveComparison } from "@/lib/catalog";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const models = resolveComparison(await getPageCatalog(), slug);
  if (!models) return { title: "Comparison not found", robots: { index: false } };
  const names = models.map((model) => model.name).join(" vs ");
  return {
    title: `${names} - AI Model Comparison`,
    description: `Compare ${names}: source-linked pricing, context windows, reasoning, coding, image and audio support, APIs, and licensing.`,
    alternates: { canonical: `/compare/${slug}` },
    openGraph: { title: `${names} - AI Compare`, description: "Different models. A clearer picture. Compare the details side by side." },
  };
}

export default async function ComparisonPage({ params }: Props) {
  const { slug } = await params;
  const models = resolveComparison(await getPageCatalog(), slug);
  if (!models) notFound();
  return <ComparisonWorkspace initialModels={models} />;
}
