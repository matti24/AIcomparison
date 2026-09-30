import type { AIModel, Catalog, Fact, Provider } from "@/lib/types";

const unknownFact = <T,>(now: string): Fact<T> => ({ value: null, source: null, updatedAt: now });

export function newModelTemplate(catalog: Catalog, now: string): AIModel {
  let slug = "new-model";
  let suffix = 1;
  while (catalog.models.some((model) => model.slug === slug)) slug = `new-model-${++suffix}`;
  return {
    id: slug, slug, name: "New model", providerId: catalog.providers[0]?.id ?? "",
    description: "Add a source-backed description of this specific model version.",
    version: "1.0", type: "general", status: "preview",
    releaseDate: unknownFact<string>(now), knowledgeCutoff: unknownFact<string>(now),
    contextWindow: unknownFact<number>(now), maxOutput: unknownFact<number>(now),
    openness: unknownFact<"proprietary" | "open-weights" | "open-source">(now),
    apiAvailable: unknownFact<boolean>(now), freeAccess: unknownFact<boolean>(now),
    speed: unknownFact<"fast" | "balanced" | "thorough">(now),
    capabilities: {
      text: unknownFact<boolean>(now), imageInput: unknownFact<boolean>(now), imageOutput: unknownFact<boolean>(now),
      audioInput: unknownFact<boolean>(now), audioOutput: unknownFact<boolean>(now), videoInput: unknownFact<boolean>(now),
      videoOutput: unknownFact<boolean>(now), webSearch: unknownFact<boolean>(now), toolCalling: unknownFact<boolean>(now),
      structuredOutputs: unknownFact<boolean>(now), reasoning: unknownFact<boolean>(now), coding: unknownFact<boolean>(now),
      multilingual: unknownFact<boolean>(now), fineTuning: unknownFact<boolean>(now), selfHosting: unknownFact<boolean>(now),
    },
    pricing: {
      input: unknownFact<number>(now), output: unknownFact<number>(now), subscription: unknownFact<number>(now),
      currency: "USD", unit: "1M tokens",
    },
    website: "", apiDocs: null, bestFor: [], tags: [], benchmarks: [], releases: [],
    editorial: { rank: catalog.models.length + 1, trending: false, rationale: "Not yet selected for an editorial collection.", updatedAt: now },
    addedAt: now, updatedAt: now,
  };
}

export function newProviderTemplate(catalog: Catalog, now: string): Provider {
  let slug = "new-provider";
  let suffix = 1;
  while (catalog.providers.some((provider) => provider.slug === slug)) slug = `new-provider-${++suffix}`;
  return {
    id: slug, slug, name: "New provider", description: "Add a verified company description.",
    website: "", country: null, founded: null, color: "#7454d6", logo: "",
    products: [], sources: [], updatedAt: now,
  };
}
