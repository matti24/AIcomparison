import type { AIModel, Capability, Catalog, ModelType, Provider, UseCase } from "@/lib/types";

export const capabilityLabels: Record<Capability, string> = {
  text: "Text",
  imageInput: "Image understanding",
  imageOutput: "Image generation",
  audioInput: "Audio input",
  audioOutput: "Audio generation",
  videoInput: "Video understanding",
  videoOutput: "Video generation",
  webSearch: "Web search",
  toolCalling: "Tool calling",
  structuredOutputs: "Structured outputs",
  reasoning: "Reasoning",
  coding: "Coding",
  multilingual: "Multilingual",
  fineTuning: "Fine-tuning",
  selfHosting: "Self-hosting",
};

export const typeLabels: Record<ModelType, string> = {
  general: "General AI",
  reasoning: "Reasoning",
  coding: "Coding",
  image: "Image generation",
  video: "Video generation",
  speech: "Speech",
  embedding: "Embeddings",
  research: "Research & search",
};

export const useCaseLabels: Record<UseCase, string> = {
  coding: "Coding",
  writing: "Writing",
  research: "Research",
  school: "School & learning",
  business: "Business",
  "data-analysis": "Data analysis",
  "image-creation": "Image creation",
  "video-creation": "Video creation",
  "customer-support": "Customer support",
  agents: "Building AI agents",
  general: "Everyday tasks",
};

export const priorityLabels = {
  performance: "Best performance",
  cheapest: "Lowest API price",
  fastest: "Speed",
  context: "Largest context",
  privacy: "Privacy & local use",
  open: "Open-source",
  api: "API access",
  multimodal: "Multimodal capabilities",
} as const;

export type Priority = keyof typeof priorityLabels;
export type SortOrder = "featured" | "recent" | "popular" | "trending" | "cheapest" | "context";
export type Availability = "free" | "paid" | "api" | "open" | "self-hosted";

export interface ModelFilters {
  query: string;
  providers: string[];
  types: ModelType[];
  availability: Availability[];
  capabilities: Capability[];
}

export const emptyFilters: ModelFilters = {
  query: "",
  providers: [],
  types: [],
  availability: [],
  capabilities: [],
};

export function getProvider(catalog: Catalog, id: string): Provider {
  const provider = catalog.providers.find((item) => item.id === id);
  if (!provider) throw new Error(`Catalog integrity error: unknown provider "${id}".`);
  return provider;
}

export function formatContext(value: number | null) {
  if (value === null) return "Unknown";
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(2))}M`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(1))}K`;
  return value.toLocaleString("en-US");
}

export function formatPrice(value: number | null) {
  if (value === null) return "Unknown";
  if (value === 0) return "Free";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;
}

export function formatDate(value: string | null, compact = false) {
  if (!value) return "Not disclosed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    month: compact ? "short" : "long",
    ...(compact ? {} : { day: "numeric" }),
    year: "numeric",
    timeZone: "UTC",
  });
}

export function opennessLabel(model: AIModel) {
  const value = model.openness.value;
  return value === "open-source" ? "Open-source" : value === "open-weights" ? "Open weights" : value === "proprietary" ? "Proprietary" : "Unknown";
}

export function getModalities(model: AIModel) {
  const result: string[] = [];
  if (model.capabilities.text.value) result.push("Text");
  if (model.capabilities.imageInput.value || model.capabilities.imageOutput.value) result.push("Image");
  if (model.capabilities.audioInput.value || model.capabilities.audioOutput.value) result.push("Audio");
  if (model.capabilities.videoInput.value || model.capabilities.videoOutput.value) result.push("Video");
  return result;
}

export function isOpen(model: AIModel) {
  return model.openness.value === "open-source" || model.openness.value === "open-weights";
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[-_/]/g, " ").replace(/\s+/g, " ").trim();
}

export function matchesSearch(model: AIModel, provider: Provider, query: string): boolean {
  let text = normalized(query);
  if (!text) return true;
  const constraints: [RegExp, () => boolean][] = [
    [/\bopen source\b/g, () => model.openness.value === "open-source"],
    [/\bopen (?:weights|models)\b/g, () => isOpen(model)],
    [/\b(?:self hosted|local|privacy)\b/g, () => model.capabilities.selfHosting.value === true],
    [/\b(?:cheap|cheapest|affordable|budget)\b/g, () => model.pricing.input.value !== null && model.pricing.input.value <= 1],
    [/\b(?:large|largest|long) context(?: window)?\b/g, () => (model.contextWindow.value ?? 0) >= 128_000],
    [/\bfree\b/g, () => model.freeAccess.value === true],
    [/\bapi\b/g, () => model.apiAvailable.value === true],
    [/\b(?:web|search|browsing)\b/g, () => model.capabilities.webSearch.value === true || model.type === "research"],
    [/\b(?:images?|vision|visual)\b/g, () => model.capabilities.imageInput.value === true || model.capabilities.imageOutput.value === true],
    [/\bvideos?\b/g, () => model.capabilities.videoInput.value === true || model.capabilities.videoOutput.value === true],
    [/\b(?:audio|voice|speech)\b/g, () => model.capabilities.audioInput.value === true || model.capabilities.audioOutput.value === true],
    [/\b(?:tools?|function calling)\b/g, () => model.capabilities.toolCalling.value === true],
    [/\breasoning\b/g, () => model.capabilities.reasoning.value === true || model.type === "reasoning"],
    [/\b(?:coding|code|programming)\b/g, () => model.capabilities.coding.value === true],
    [/\bmultimodal\b/g, () => getModalities(model).length > 1],
  ];
  for (const [pattern, test] of constraints) {
    if (pattern.test(text)) {
      if (!test()) return false;
      text = text.replace(pattern, " ");
    }
  }
  const ignored = new Set(["ai", "model", "models", "company", "companies", "with", "for", "the", "and", "a", "an", "that", "support", "supports", "window"]);
  const terms = text.split(/\s+/).filter((word) => word && !ignored.has(word));
  const haystack = normalized([
    model.name, provider.name, model.description, typeLabels[model.type],
    ...model.bestFor.map((key) => useCaseLabels[key]), ...model.tags,
    ...provider.products.map((product) => product.name),
  ].join(" "));
  return terms.every((term) => haystack.includes(term));
}

export function filterModels(catalog: Catalog, filters: ModelFilters): AIModel[] {
  return catalog.models.filter((model) => {
    if (filters.providers.length && !filters.providers.includes(model.providerId)) return false;
    if (filters.types.length && !filters.types.includes(model.type)) return false;
    if (!filters.capabilities.every((key) => model.capabilities[key].value === true)) return false;
    if (!filters.availability.every((value) => {
      if (value === "free") return model.freeAccess.value === true;
      if (value === "paid") return (model.pricing.input.value ?? 0) > 0 || (model.pricing.subscription.value ?? 0) > 0;
      if (value === "api") return model.apiAvailable.value === true;
      if (value === "open") return model.openness.value === "open-source";
      return model.capabilities.selfHosting.value === true;
    })) return false;
    return matchesSearch(model, getProvider(catalog, model.providerId), filters.query);
  });
}

export function sortModels(models: AIModel[], order: SortOrder) {
  return [...models].sort((a, b) => {
    if (order === "cheapest") return (a.pricing.input.value ?? Infinity) - (b.pricing.input.value ?? Infinity) || a.editorial.rank - b.editorial.rank;
    if (order === "context") return (b.contextWindow.value ?? -1) - (a.contextWindow.value ?? -1);
    if (order === "recent") return (b.releaseDate.value ?? "").localeCompare(a.releaseDate.value ?? "");
    if (order === "trending") return Number(b.editorial.trending) - Number(a.editorial.trending) || a.editorial.rank - b.editorial.rank;
    return a.editorial.rank - b.editorial.rank;
  });
}

export function comparisonPath(slugs: string[]) {
  return `/compare/${slugs.join("-vs-")}`;
}

export function resolveComparison(catalog: Catalog, slug: string) {
  const slugs = slug.split("-vs-");
  if (slugs.length < 2 || slugs.length > 4 || new Set(slugs).size !== slugs.length) return null;
  const models = slugs.map((value) => catalog.models.find((model) => model.slug === value));
  if (models.some((model) => !model)) return null;
  return models.filter((model): model is AIModel => Boolean(model));
}

export function recommendModels(catalog: Catalog, useCase: UseCase, priority: Priority) {
  let matches = catalog.models.filter((model) => model.status !== "deprecated" && (
    model.bestFor.includes(useCase) ||
    (useCase === "image-creation" && model.capabilities.imageOutput.value === true) ||
    (useCase === "video-creation" && model.capabilities.videoOutput.value === true)
  ));
  if (priority === "privacy") matches = matches.filter((model) => model.capabilities.selfHosting.value === true);
  if (priority === "open") matches = matches.filter((model) => model.openness.value === "open-source");
  if (priority === "api") matches = matches.filter((model) => model.apiAvailable.value === true);
  if (priority === "multimodal") matches = matches.filter((model) => getModalities(model).length > 1);
  if (priority === "cheapest") matches = matches.filter((model) => model.pricing.input.value !== null);
  if (priority === "context") matches = matches.filter((model) => model.contextWindow.value !== null);
  if (priority === "fastest") matches = matches.filter((model) => model.speed.value === "fast");
  const ordered = sortModels(matches, priority === "cheapest" ? "cheapest" : priority === "context" ? "context" : "featured");
  return ordered.slice(0, 4).map((model) => {
    const reasons = [`Suited to ${useCaseLabels[useCase].toLowerCase()} based on its documented capabilities.`];
    if (priority === "cheapest") reasons.push(`${formatPrice(model.pricing.input.value)} per 1M input tokens; output rates and provider fees vary.`);
    if (priority === "context") reasons.push(`${formatContext(model.contextWindow.value)} token context for longer inputs.`);
    if (priority === "privacy") reasons.push("Supports self-hosting, so you can control where inference runs. Check the license and your deployment.");
    if (priority === "open") reasons.push("Published with an open-source license; review the linked license for conditions.");
    if (priority === "api") reasons.push("An API is available for your own applications and workflows.");
    if (priority === "multimodal") reasons.push(`Documented ${getModalities(model).join(", ").toLowerCase()} support.`);
    if (priority === "fastest") reasons.push("The source documents a fast speed category; this is not a cross-provider latency benchmark.");
    if (priority === "performance") reasons.push("An editorial use-case match, not an objective performance ranking.");
    return { model, reasons };
  });
}

export function suggestedComparisons(catalog: Catalog) {
  const first = (query: string) => sortModels(catalog.models.filter((model) => {
    const provider = getProvider(catalog, model.providerId);
    return normalized(provider.name).includes(query) && model.status !== "deprecated" && (model.type === "general" || model.type === "reasoning");
  }), "featured")[0];
  const pairs = [
    { a: "openai", b: "anthropic", title: "ChatGPT vs Claude", category: "The everyday essentials" },
    { a: "google", b: "openai", title: "Gemini vs ChatGPT", category: "Two different approaches" },
    { a: "anthropic", b: "google", title: "Claude vs Gemini", category: "Reasoning meets versatility" },
    { a: "deepseek", b: "openai", title: "DeepSeek vs ChatGPT", category: "Open weights or closed?" },
    { a: "xai", b: "openai", title: "Grok vs ChatGPT", category: "A fresh perspective" },
    { a: "meta", b: "alibaba", title: "Llama vs Qwen", category: "Explore open ecosystems" },
    { a: "mistral", b: "meta", title: "Mistral vs Llama", category: "Build on your own terms" },
  ];
  return pairs.flatMap((pair) => {
    const a = first(pair.a);
    const b = first(pair.b);
    return a && b ? [{ ...pair, models: [a, b] }] : [];
  });
}
