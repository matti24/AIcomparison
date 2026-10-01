import Link from "next/link";
import { ChevronRight, SearchX } from "lucide-react";
import { siteUrlClient } from "@/lib/site";
import { cn } from "@/lib/utils";

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  // Escape "<" so catalog text can never terminate the script element.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export interface Crumb {
  href: string;
  label: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const all = [{ href: "/", label: "Home" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className={cn("text-[13px] text-muted-foreground", className)}>
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((item, index) => (
            <li key={item.href} className="flex items-center gap-1">
              {index > 0 && <ChevronRight size={13} aria-hidden="true" className="text-subtle" />}
              {index === all.length - 1 ? (
                <span aria-current="page" className="text-foreground">{item.label}</span>
              ) : (
                <Link href={item.href} className="hover:text-foreground">{item.label}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: all.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.label, item: `${siteUrlClient()}${item.href}` })),
      }} />
    </>
  );
}

export function PageHeader({ eyebrow, title, description, breadcrumbs, children, className }: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: Crumb[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("page-header", className)}>
      <div className="container-page">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="mb-4" />}
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="lede">{description}</p>}
        {children && <div className="mt-5">{children}</div>}
      </div>
    </header>
  );
}

export function EmptyState({ title, description, children, icon }: { title: string; description: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <span className="grid size-11 place-items-center rounded-full border bg-card text-muted-foreground">{icon ?? <SearchX size={20} />}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function SectionHead({ title, description, action, id }: { title: string; description?: string; action?: React.ReactNode; id?: string }) {
  return (
    <div className="section-head">
      <div>
        <h2 id={id}>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
