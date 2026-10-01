import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, Placeholder } from "@/components/content-page";
import { catalogStats } from "@/lib/catalog";
import { getPageCatalog } from "@/lib/server-catalog";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "About AI Compare", description: "AI Compare is an independent, source-linked database for comparing AI models, pricing, and capabilities.", alternates: { canonical: "/about" } };

export default async function AboutPage() {
  const stats = catalogStats(await getPageCatalog());
  return (
    <ContentPage title="About AI Compare" description="An independent, source-linked database of AI models." path="/about" label="About" updated={null}>
      <p>AI models change every week: new versions, new prices, new context limits, deprecations. Comparing them usually means opening a dozen provider docs. AI Compare puts that information in one consistent structure, so you can compare models side by side and see exactly where each fact came from.</p>
      <p>Today the catalog tracks <strong>{stats.models}</strong> models from <strong>{stats.providers}</strong> providers, backed by <strong>{stats.sources.toLocaleString("en-US")}</strong> cited sources and <strong>{stats.benchmarks}</strong> published benchmark results.</p>
      <h2>What we believe</h2>
      <ul>
        <li><strong>Sources over opinions.</strong> Every important fact links to the page it came from, with the date we checked it.</li>
        <li><strong>Unknown means unknown.</strong> If a provider doesn&apos;t disclose something, we say so rather than estimate it.</li>
        <li><strong>No fake winners.</strong> We never combine benchmarks into one &ldquo;intelligence score&rdquo; or declare a universally best model.</li>
        <li><strong>Useful first, monetized second.</strong> Sponsorships and affiliate links are labeled and never change data or ordering.</li>
      </ul>
      <p>Read the full <Link href="/methodology">methodology</Link>, or see what changed recently in the <Link href="/changelog">changelog</Link>.</p>
      <h2>Who runs AI Compare</h2>
      <p><Placeholder value={LEGAL.companyName} label="Company / team description" /></p>
      <h2>Contact</h2>
      <p>Corrections, partnerships, and press: <Link href="/contact">contact us</Link>.</p>
    </ContentPage>
  );
}
