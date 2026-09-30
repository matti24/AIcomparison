import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ChartNoAxesCombined, CircleHelp, GitBranch, ShieldCheck, TrendingUp } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Our Methodology - Independent, Source-Linked AI Comparisons",
  description: "How AI Compare handles model facts, pricing sources, editorial trends, benchmarks, licensing, and recommendation transparency.",
  alternates: { canonical: "/methodology" },
};

const principles = [
  { icon: ShieldCheck, title: "A source is better than a superlative.", text: "Technical facts and prices carry a source, a last-updated date, and notes when a number needs context. We prefer official documentation, model cards, and release announcements. This is a curated reference catalog, not a live feed; a model's page may contain facts verified on different dates. Always check the source before purchasing or deploying." },
  { icon: CircleHelp, title: "Unknown is an honest answer.", text: "Unknown means there is no reliable documented value in this catalog. It is never treated as zero, free, or supported. Models with unknown input prices sort after known prices. Deprecated models remain searchable for historical comparisons, and previews are labeled." },
  { icon: ChartNoAxesCombined, title: "No single number tells the whole story.", text: "Benchmarks must include the test name, reported score, date, source, and any important configuration notes. Different versions, test harnesses, prompting setups, and budgets can produce different results. We do not combine unrelated benchmark results into a universal AI score or invent numbers to fill a chart." },
  { icon: TrendingUp, title: "Trending, with the origin attached.", text: "Our current trending selections, popular comparison starting points, and most-popular sort order are manually curated editorial choices. They are not measured market share, traffic, developer adoption, or usage. The database is designed for future sourced trend signals, with source labels, observation periods, and collection methodology." },
  { icon: GitBranch, title: "Companies, products, and models are different.", text: "A company builds products; a product can offer several model versions. ChatGPT is a product, for example, while a specific API model is a model version. Product comparison starting points always resolve to named model versions. Capabilities in our tables refer to the documented model or access path, not everything a chat product can do." },
  { icon: BookOpen, title: "Open weights are not automatically open-source.", text: "Downloadable weights can still have commercial, acceptable-use, or redistribution restrictions. We label open weights separately from open-source licensing. The open-source directory filter and finder priority only include models explicitly labeled open-source. Read the linked license and assess it for your deployment." },
];

export default function MethodologyPage() {
  return (
    <div className="content-width pb-14">
      <PageHeading eyebrow="Independent by design" title="A little less hype. A lot more clarity." description="AI moves quickly. Good information should help you keep up without asking you to take a leap of faith. Here's how we approach it." />
      <div className="methodology-grid">{principles.map(({ icon: Icon, title, text }) => <section className="panel" key={title}><span className="methodology-icon"><Icon size={21} strokeWidth={1.5} /></span><h2>{title}</h2><p>{text}</p></section>)}</div>
      <section className="panel mt-6"><h2 className="panel-title">A few useful things to know.</h2><div className="methodology-details">
        <div><h3>Pricing is a starting point.</h3><p>API prices are USD per million tokens in the stated published tier. Input and output are separate. Caching, batching, reasoning tokens, tools, model hosting, and long-context tiers can change the cost. Image and video models may use entirely different billing units; unsupported token prices stay unknown. Product subscriptions are not API subscriptions.</p></div>
        <div><h3>The finder uses explained rules.</h3><p>Your use case matches editorial tags or documented generation capabilities. Your priority then filters or sorts the candidates. Privacy requires self-hosting; open-source requires an open-source label; API requires documented API availability. Cheapest means lowest known input-token rate, not total workload cost. Speed is only used if a source supports it. Performance means editorial fit, never an objective best-model claim.</p></div>
        <div><h3>Search shortcuts have clear meanings.</h3><p>&ldquo;Cheap&rdquo; means a documented input rate at or below $1 per million tokens. &ldquo;Large context&rdquo; means at least 128,000 tokens. Capability and availability filters combine with AND; multiple providers and model types combine with OR inside their group. Unknown capability values never count as a match.</p></div>
        <div><h3>Your shortlist stays yours.</h3><p>Favorites, recent models, and comparison selections are stored in your browser. No account is needed. The site does not send email notifications or silently track your browsing. Shared comparison links contain model slugs only. Browser storage can be cleared using your browser&apos;s site-data controls.</p></div>
      </div><Button asChild variant="outline" className="mt-6"><Link href="/models">Back to the possibilities <ArrowRight size={13} /></Link></Button></section>
    </div>
  );
}
