import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModelProfile } from "@/components/model-profile";
import { getPageCatalog } from "@/lib/server-catalog";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const model = (await getPageCatalog()).models.find((item) => item.slug === slug);
  if (!model) return { title: "Model not found", robots: { index: false } };
  return {
    title: `${model.name} - Pricing, Context Window & Capabilities`,
    description: `${model.description} Explore source-linked pricing, context limits, capabilities, benchmarks, and release history.`,
    alternates: { canonical: `/models/${model.slug}` },
    openGraph: { title: `${model.name} - AI Compare`, description: model.description },
  };
}

export default async function ModelPage({ params }: Props) {
  const { slug } = await params;
  const model = (await getPageCatalog()).models.find((item) => item.slug === slug);
  if (!model) notFound();
  return <ModelProfile key={model.slug} model={model} />;
}
