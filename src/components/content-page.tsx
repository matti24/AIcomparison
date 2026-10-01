import { PageHeader } from "@/components/ui-kit";
import { formatDate } from "@/lib/catalog";
import { LEGAL } from "@/lib/site";

export function Placeholder({ value, label }: { value: string | null; label: string }) {
  return value ? <>{value}</> : <span className="placeholder" title="Set this value before launch">[{label}]</span>;
}

export function ContentPage({ title, description, path, label, children, updated = LEGAL.effectiveDate }: {
  title: string;
  description?: string;
  path: string;
  label: string;
  children: React.ReactNode;
  updated?: string | null;
}) {
  return (
    <>
      <PageHeader title={title} description={description} breadcrumbs={[{ href: path, label }]} />
      <div className="container-narrow py-10">
        {updated && <p className="mb-6 text-[13px] text-muted-foreground">Last updated {formatDate(updated)}</p>}
        <div className="prose">{children}</div>
      </div>
    </>
  );
}
