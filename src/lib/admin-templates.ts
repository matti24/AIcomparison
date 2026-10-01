import { CAPABILITIES, type AIModel, type Catalog, type Fact, type OutboundLink, type Provider, type SponsoredPlacement } from "@/lib/types";

const unknownFact = <T,>(now: string): Fact<T> => ({ value: null, source: null, updatedAt: now });

function uniqueId(existing: { id: string }[], base: string) {
  let id = base;
  let suffix = 1;
  while (existing.some((entry) => entry.id === id)) id = `${base}-${++suffix}`;
  return id;
}

export function newModelTemplate(catalog: Catalog, now: string): AIModel {
  const slug = uniqueId(catalog.models, "new-model");
  return {
    id: slug, slug, name: "New model", providerId: catalog.providers[0]?.id ?? "", family: "New family",
    description: "Add a source-backed description of this specific model version.",
    version: "1.0", categories: ["general"], status: "preview",
    releaseDate: unknownFact<string>(now), knowledgeCutoff: unknownFact<string>(now),
    contextWindow: unknownFact<number>(now), maxOutput: unknownFact<number>(now),
    openness: unknownFact(now), license: unknownFact<string>(now),
    apiAvailable: unknownFact<boolean>(now), freeAccess: unknownFact<boolean>(now),
    languages: unknownFact<string>(now),
    speed: unknownFact(now),
    capabilities: Object.fromEntries(CAPABILITIES.map((key) => [key, unknownFact<boolean>(now)])) as AIModel["capabilities"],
    pricing: {
      input: unknownFact<number>(now), cachedInput: unknownFact<number>(now), output: unknownFact<number>(now),
      other: unknownFact<string>(now), subscription: unknownFact<number>(now),
      currency: "USD", unit: "1M tokens",
    },
    website: "", apiDocs: null, bestFor: [], tags: [], benchmarks: [], releases: [],
    editorial: { rank: catalog.models.length + 1, trending: false, rationale: "Listed for catalog completeness. No popularity or quality ranking is implied.", trendSource: null, updatedAt: now },
    addedAt: now, updatedAt: now,
  };
}

export function newProviderTemplate(catalog: Catalog, now: string): Provider {
  const slug = uniqueId(catalog.providers, "new-provider");
  return {
    id: slug, slug, name: "New provider", kind: "lab", description: "Add a verified company description.",
    website: "", country: null, founded: null, color: "#71717a", logo: "",
    products: [], sources: [], updatedAt: now,
  };
}

export function newLinkTemplate(catalog: Catalog, now: string): OutboundLink {
  const model = catalog.models[0];
  return {
    id: uniqueId(catalog.links, "new-link"), targetType: "model", targetId: model?.id ?? "",
    label: `Try ${model?.name ?? "model"}`, destinationUrl: model?.website ?? "https://example.com",
    affiliateUrl: null, utmCampaign: "model-page", isAffiliate: false, enabled: true, updatedAt: now,
  };
}

export function newSponsoredTemplate(catalog: Catalog, now: string): SponsoredPlacement {
  return {
    id: uniqueId(catalog.sponsored, "new-placement"), slot: "home", sponsor: "Sponsor name",
    title: "Placement title", description: "One sentence describing the sponsored offer.", url: "https://example.com",
    providerId: null, modelId: null, enabled: false, startsAt: now, endsAt: null, updatedAt: now,
  };
}
