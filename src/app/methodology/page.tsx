import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { catalogStats, formatDate, NEW_WINDOW_DAYS, UPDATED_WINDOW_DAYS } from "@/lib/catalog";
import { getPageCatalog } from "@/lib/server-catalog";

export const metadata: Metadata = {
  title: "Methodology — How AI Compare collects and verifies data",
  description: "Where AI Compare's data comes from, how pricing and benchmarks are verified, what trending means, and how sponsorships and affiliate links work.",
  alternates: { canonical: "/methodology" },
};

export default async function MethodologyPage() {
  const catalog = await getPageCatalog();
  const stats = catalogStats(catalog);
  return (
    <ContentPage title="Methodology" description="How we collect, verify, and present AI model data — and what we deliberately don't do." path="/methodology" label="Methodology" updated={catalog.updatedAt}>
      <p>The catalog currently covers {stats.models} models from {stats.providers} providers with {stats.sources.toLocaleString("en-US")} distinct cited sources. Last catalog update: {formatDate(catalog.updatedAt)}.</p>

      <h2 id="sources">Where the data comes from</h2>
      <p>We prefer primary sources, in this order:</p>
      <ol>
        <li>Official model documentation and API references</li>
        <li>Official pricing pages</li>
        <li>Official announcements, model cards, and system cards (including official Hugging Face and GitHub repositories)</li>
        <li>Independent evaluations — only for benchmark results, and labeled as independent</li>
      </ol>
      <p>Every important fact stores its value, source name, source URL, and the date we checked it. Model pages show a source marker next to each value and a full source list at the bottom.</p>

      <h2 id="unknown">Unknown means unknown</h2>
      <p>If a provider doesn&apos;t publish a value, we show &ldquo;Not disclosed&rdquo;. Unknown is never treated as zero, &ldquo;no&rdquo;, or free. We don&apos;t copy a value from a sibling model or estimate from parameters.</p>

      <h2 id="pricing">How pricing is recorded</h2>
      <ul>
        <li>Prices are USD per million tokens at the provider&apos;s standard tier. Long-context, priority, batch, and regional tiers are described in notes.</li>
        <li>Cached-input prices are recorded where a provider publishes a cache-hit rate.</li>
        <li>Image, video, audio, and music models often bill per image, per second, or per minute. We quote those prices verbatim and never convert them into fake token rates.</li>
        <li>When a price comes from a third-party host rather than the model&apos;s creator, the note says so.</li>
        <li>The calculator multiplies your token counts by published rates. It excludes taxes, tool fees, and tier surcharges.</li>
      </ul>

      <h2 id="status">Model status</h2>
      <ul>
        <li><strong>Active</strong> — generally available from the provider.</li>
        <li><strong>Preview</strong> — preview, experimental, or beta access.</li>
        <li><strong>Deprecated</strong> — the provider announced a shutdown or replacement; it may still work.</li>
        <li><strong>Retired</strong> — shut down. Kept for historical comparison and hidden from default lists.</li>
        <li><strong>New</strong> badges mark models released within the last {NEW_WINDOW_DAYS} days; <strong>Updated</strong> marks a recorded change within {UPDATED_WINDOW_DAYS} days.</li>
      </ul>

      <h2 id="benchmarks">How benchmarks work</h2>
      <ul>
        <li>Each result stores the benchmark, score, version or subset, evaluation date, test conditions, source, and whether it was <strong>provider-reported</strong> or <strong>independent</strong>.</li>
        <li>Provider-reported results often use different prompts, tools, or effort settings than independent runs. We show both, labeled, and never mix them silently.</li>
        <li>We never combine different benchmarks into a single &ldquo;intelligence&rdquo; number.</li>
        <li>Charts highlight numeric values only; there are no subjective &ldquo;winner&rdquo; badges.</li>
      </ul>

      <h2 id="trending">What &ldquo;trending&rdquo; means</h2>
      <p>We don&apos;t have — and won&apos;t invent — usage or popularity data. A model appears in <em>Trending now</em> only when there is a recent, citable signal such as an official launch or major update, and the card links to that source. As our own anonymous, consented analytics grow, we may add clearly labeled &ldquo;most viewed on AI Compare&rdquo; lists.</p>

      <h2 id="comparisons">Comparisons and highlights</h2>
      <p>In comparisons, &ldquo;Lowest&rdquo; and &ldquo;Largest&rdquo; badges mark objective numeric extremes such as the lowest published price or the largest context window. We don&apos;t label any model as universally better. The text summaries below each comparison are generated only from the structured facts in the table.</p>

      <h2 id="finder">AI Finder</h2>
      <p>The finder is a transparent rule-based filter over documented capabilities, prices, and licenses. Each result lists the exact reasons it matched. &ldquo;Quality&rdquo; and &ldquo;speed&rdquo; preferences fall back to our editorial order because we don&apos;t have universal measurements for them — the finder tells you when that happens.</p>

      <h2 id="sponsored">Sponsored placements</h2>
      <p>Sponsored placements are always labeled &ldquo;Sponsored&rdquo;, name the sponsor, sit outside model lists and comparisons, and never change data or ordering. See the <Link href="/advertising-disclosure">Advertising Disclosure</Link>.</p>

      <h2 id="affiliate">Affiliate links</h2>
      <p>Some &ldquo;Try&rdquo; buttons may become affiliate links. They&apos;re disclosed, marked <code>rel=&quot;sponsored&quot;</code>, and have no influence on data, filters, or recommendations. See the <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>.</p>

      <h2 id="updates">Updates and corrections</h2>
      <p>Editors update the catalog through a protected admin studio; every edit records when and by whom it was made, and invalid or unsourced facts are rejected by validation. The data model is built so updates can also come from automated synchronization with official documentation, always with review. Found an error? <Link href="/contact">Tell us</Link>.</p>
    </ContentPage>
  );
}
