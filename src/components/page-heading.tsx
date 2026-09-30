import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeading({ eyebrow, title, description, children, breadcrumb }: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}) {
  return (
    <header className="page-header">
      {breadcrumb && <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link>{breadcrumb.map((item) => <span key={item.label} className="flex items-center gap-2"><ChevronRight size={11} />{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</span>)}</nav>}
      <span className="eyebrow">{eyebrow}</span>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><h1>{title}</h1><p>{description}</p></div>
        {children}
      </div>
    </header>
  );
}
