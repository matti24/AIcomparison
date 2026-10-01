import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProviderLogo } from "@/components/brand";
import { PageHeader } from "@/components/ui-kit";
import { providerPath } from "@/lib/catalog";
import { getPageCatalog } from "@/lib/server-catalog";

export const metadata: Metadata = {
  title: "AI Model Providers — Labs and API Platforms",
  description: "Every AI provider in the catalog: model labs and inference platforms, with their models, release timelines, and sources.",
  alternates: { canonical: "/providers" },
};

export default async function ProvidersPage() {
  const catalog = await getPageCatalog();
  const rows = catalog.providers.map((provider) => {
    const models = catalog.models.filter((model) => model.providerId === provider.id);
    return {
      provider,
      total: models.length,
      active: models.filter((model) => model.status === "active" || model.status === "preview").length,
      open: models.filter((model) => model.openness.value === "open-weights" || model.openness.value === "open-source").length,
      latest: models.map((model) => model.releaseDate.value).filter(Boolean).sort().at(-1) ?? null,
    };
  });
  const labs = rows.filter((row) => row.provider.kind === "lab").sort((a, b) => b.total - a.total || a.provider.name.localeCompare(b.provider.name));
  const platforms = rows.filter((row) => row.provider.kind === "platform").sort((a, b) => a.provider.name.localeCompare(b.provider.name));

  const grid = (list: typeof rows) => (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map(({ provider, total, active, open }) => (
        <li key={provider.id}>
          <Link href={providerPath(provider.slug)} className="panel flex h-full items-start gap-3 p-4 transition-shadow hover:border-border-strong hover:shadow-[var(--shadow-md)]">
            <ProviderLogo provider={provider} size={40} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{provider.name}</p>
              <p className="text-xs text-muted-foreground">{[provider.country, provider.founded ? `Founded ${provider.founded}` : null].filter(Boolean).join(" · ") || (provider.kind === "platform" ? "Inference platform" : "AI lab")}</p>
              <p className="mt-2 line-clamp-2 text-[13px] text-muted-foreground">{provider.description}</p>
              <p className="mt-3 flex gap-3 text-xs tabular">
                <span><strong>{total}</strong> models</span>
                <span className="text-muted-foreground">{active} active</span>
                {open > 0 && <span className="text-positive">{open} open</span>}
              </p>
            </div>
            <ArrowRight size={15} className="mt-1 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <PageHeader
        title="AI providers"
        description={`${labs.length} model labs and ${platforms.length} inference platforms. Labs build models; platforms host and route models built by others.`}
        breadcrumbs={[{ href: "/providers", label: "Providers" }]}
      />
      <div className="container-page py-8">
        <h2 className="mb-4 text-xl">Model labs</h2>
        {grid(labs)}
        {platforms.length > 0 && (
          <>
            <h2 className="mt-12 mb-1 text-xl">Inference & routing platforms</h2>
            <p className="mb-4 text-[14px] text-muted-foreground">These companies serve models from many labs. Model pages stay attributed to the lab that built the model.</p>
            {grid(platforms)}
          </>
        )}
      </div>
    </>
  );
}
