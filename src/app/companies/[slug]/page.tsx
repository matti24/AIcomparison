import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanyProfile } from "@/components/company-pages";
import { getPageCatalog } from "@/lib/server-catalog";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const provider = (await getPageCatalog()).providers.find((item) => item.slug === slug);
  if (!provider) return { title: "Company not found", robots: { index: false } };
  return { title: `${provider.name} - AI Models, Products & Company Profile`, description: provider.description, alternates: { canonical: `/companies/${slug}` } };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const provider = (await getPageCatalog()).providers.find((item) => item.slug === slug);
  if (!provider) notFound();
  return <CompanyProfile provider={provider} />;
}
