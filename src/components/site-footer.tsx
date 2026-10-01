import Link from "next/link";
import { BrandMark } from "@/components/brand";
import { NewsletterForm } from "@/components/newsletter";
import { ConsentSettingsButton, ThemeSelect } from "@/components/site-client";
import { formatDate } from "@/lib/catalog";

const columns = [
  { title: "Product", links: [["/models", "Models"], ["/compare", "Compare"], ["/benchmarks", "Benchmarks"], ["/releases", "Releases"], ["/pricing-calculator", "Pricing calculator"], ["/ai-finder", "AI Finder"]] },
  { title: "Discover", links: [["/models/coding", "Coding AI"], ["/models/open-source", "Open Source"], ["/models/image-generation", "Image AI"], ["/models/video-generation", "Video AI"], ["/models/long-context", "1M+ context"], ["/models/cheap-api", "Low-cost APIs"]] },
  { title: "Company", links: [["/about", "About"], ["/methodology", "Methodology"], ["/changelog", "Changelog"], ["/pricing", "AI Compare Pro"], ["/api", "Data API"], ["/contact", "Contact"]] },
  { title: "Legal", links: [["/privacy", "Privacy"], ["/terms", "Terms"], ["/cookies", "Cookies"], ["/affiliate-disclosure", "Affiliate Disclosure"], ["/advertising-disclosure", "Advertising Disclosure"]] },
] as const;

export function SiteFooter({ modelCount, providerCount, updatedAt }: { modelCount: number; providerCount: number; updatedAt: string }) {
  return (
    <footer className="site-footer">
      <div className="container-page">
        <div className="footer-grid">
          <div className="max-w-sm">
            <Link href="/" className="brand"><BrandMark /> AI Compare</Link>
            <p className="mt-3 text-muted-foreground">An independent, source-linked database of AI models, pricing, and capabilities.</p>
            <p className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="status-dot" aria-hidden="true" />
              <span className="tabular">{modelCount} models · {providerCount} providers · updated {formatDate(updatedAt, "short")}</span>
            </p>
            <div className="mt-5">
              <p className="mb-2 text-[13px] font-semibold">The AI Model Brief</p>
              <NewsletterForm source="footer" compact />
            </div>
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-4 border-t pt-6 text-[13px] text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} AI Compare. Provider names and logos belong to their owners and do not imply endorsement.</p>
          <div className="flex flex-wrap items-center gap-4">
            <ConsentSettingsButton />
            <ThemeSelect />
          </div>
        </div>
      </div>
    </footer>
  );
}
