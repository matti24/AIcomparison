import type {
  AIModel,
  Capability,
  Catalog,
  ModelCategory,
  ModelEventType,
  ModelStatus,
  Openness,
  Provider,
  ProviderKind,
  UseCase,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Labels                                                                      */
/* -------------------------------------------------------------------------- */

export const capabilityLabels: Record<Capability, string> = {
  text: "Text",
  imageInput: "Image input",
  imageOutput: "Image generation",
  imageEditing: "Image editing",
  audioInput: "Audio input",
  audioOutput: "Audio output",
  videoInput: "Video input",
  videoOutput: "Video generation",
  realtime: "Realtime",
  webSearch: "Web search",
  toolCalling: "Tool calling",
  structuredOutputs: "Structured output",
  reasoning: "Reasoning",
  coding: "Coding",
  computerUse: "Computer use",
  multilingual: "Multilingual",
  fineTuning: "Fine-tuning",
  batchApi: "Batch API",
  embeddings: "Embeddings",
  selfHosting: "Self-hosting",
};

export const categoryLabels: Record<ModelCategory, string> = {
  general: "General-purpose LLM",
  reasoning: "Reasoning",
  coding: "Coding",
  agentic: "Agentic",
  search: "Search & research",
  "image-generation": "Image generation",
  "image-editing": "Image editing",
  "video-generation": "Video generation",
  "speech-to-text": "Speech-to-text",
  "text-to-speech": "Text-to-speech",
  "realtime-voice": "Realtime voice",
  "music-generation": "Music generation",
  embeddings: "Embeddings",
  ocr: "OCR",
  "computer-use": "Computer use",
  robotics: "Robotics",
  vision: "Vision",
  multimodal: "Multimodal",
  moderation: "Safety & moderation",
};

export const categoryShortLabels: Record<ModelCategory, string> = {
  ...categoryLabels,
  general: "General",
  search: "Research",
  "image-generation": "Image",
  "image-editing": "Image editing",
  "video-generation": "Video",
  "speech-to-text": "Speech-to-text",
  "text-to-speech": "Text-to-speech",
  "realtime-voice": "Voice",
  "music-generation": "Music",
  moderation: "Safety",
};

export const statusLabels: Record<ModelStatus, string> = {
  active: "Active",
  preview: "Preview",
  deprecated: "Deprecated",
  retired: "Retired",
};

export const useCaseLabels: Record<UseCase, string> = {
  coding: "Coding",
  writing: "Writing",
  research: "Research",
  school: "Learning",
  business: "Business",
  "data-analysis": "Data analysis",
  "image-creation": "Image creation",
  "video-creation": "Video creation",
  voice: "Voice",
  "customer-support": "Customer support",
  agents: "Agents",
  vision: "Vision",
  "long-context": "Long context",
  "high-volume": "High-volume API",
  general: "Everyday tasks",
};

export const eventTypeLabels: Record<ModelEventType, string> = {
  release: "New model",
  update: "Model update",
  pricing: "Pricing change",
  "api-feature": "New API feature",
  context: "Context change",
  modality: "New modality",
  deprecation: "Deprecation",
  retirement: "Retirement",
};

export const opennessLabels: Record<Openness, string> = {
  proprietary: "Proprietary",
  "open-weights": "Open weights",
  "open-source": "Open source",
};

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

export const UNKNOWN = "Not disclosed";

export function formatTokens(value: number | null | undefined, unknown = UNKNOWN) {
  if (value === null || value === undefined) return unknown;
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(2))}M`;
  if (value >= 1_000) return `${Number((value / 1_000).toFixed(1))}K`;
  return value.toLocaleString("en-US");
}

export const formatContext = formatTokens;

export function formatPrice(value: number | null | undefined, unknown = UNKNOWN) {
  if (value === null || value === undefined) return unknown;
  if (value === 0) return "$0";
  const digits = value < 0.1 ? 3 : 2;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
}

export function formatUsd(value: number) {
  if (value === 0) return "$0.00";
  if (value < 0.01) return `$${value.toLocaleString("en-US", { maximumSignificantDigits: 2 })}`;
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 100 ? 2 : 0 });
}

export function formatDate(value: string | null | undefined, style: "long" | "short" | "month" = "long") {
  if (!value) return UNKNOWN;
  // Month- or year-precision values stay at the published precision.
  if (/^\d{4}$/.test(value)) return value;
  const monthOnly = /^\d{4}-\d{2}$/.test(value);
  const date = new Date(monthOnly ? `${value}-01T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return UNKNOWN;
  return date.toLocaleDateString("en-US", {
    month: style === "long" ? "long" : "short",
    ...(style === "month" || monthOnly ? {} : { day: "numeric" }),
    year: "numeric",
    timeZone: "UTC",
  });
}

const DAY = 24 * 60 * 60 * 1000;

export function daysBetween(from: string, to: string) {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / DAY);
}

export function formatRelative(value: string | null | undefined, referenceDate: string) {
  if (!value) return UNKNOWN;
  const days = daysBetween(value, referenceDate);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/* -------------------------------------------------------------------------- */
/* Paths                                                                       */
/* -------------------------------------------------------------------------- */

export function modelPath(providerSlug: string, modelSlug: string) {
  return `/models/${providerSlug}/${modelSlug}`;
}

export function providerPath(providerSlug: string) {
  return `/providers/${providerSlug}`;
}

export function comparisonPath(slugs: string[]) {
  return `/compare/${slugs.join("-vs-")}`;
}

/** Order-independent canonical form so A-vs-B and B-vs-A do not compete in search. */
export function canonicalComparisonSlugs(slugs: string[]) {
  return [...slugs].sort((a, b) => a.localeCompare(b));
}

/* -------------------------------------------------------------------------- */
/* Catalog helpers                                                             */
/* -------------------------------------------------------------------------- */

export function getProvider(catalog: Pick<Catalog, "providers">, id: string): Provider {
  const provider = catalog.providers.find((item) => item.id === id);
  if (!provider) throw new Error(`Catalog integrity error: unknown provider "${id}".`);
  return provider;
}

export function findModel(catalog: Catalog, slug: string) {
  return catalog.models.find((model) => model.slug === slug) ?? null;
}

export function isOpenModel(openness: Openness | null | undefined) {
  return openness === "open-source" || openness === "open-weights";
}

export function trueCapabilities(model: AIModel): Capability[] {
  return (Object.keys(model.capabilities) as Capability[]).filter((key) => model.capabilities[key].value === true);
}

export function modalitiesFromCaps(caps: Capability[]) {
  const has = (key: Capability) => caps.includes(key);
  const result: string[] = [];
  if (has("text")) result.push("Text");
  if (has("imageInput") || has("imageOutput") || has("imageEditing")) result.push("Image");
  if (has("audioInput") || has("audioOutput")) result.push("Audio");
  if (has("videoInput") || has("videoOutput")) result.push("Video");
  return result;
}

/** The most recent non-release change, for "Updated" badges and sorting. */
export function lastChange(model: AIModel) {
  const changes = model.releases
    .filter((event) => event.type !== "release")
    .sort((a, b) => b.date.localeCompare(a.date));
  return changes[0] ? { date: changes[0].date, type: changes[0].type } : null;
}

export function latestPriceCheck(model: AIModel) {
  const dates = [model.pricing.input, model.pricing.output, model.pricing.cachedInput, model.pricing.other]
    .map((fact) => fact.source?.checkedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates.at(-1) ?? null;
}

/** Most recent verification date across all cited facts of the model. */
export function latestVerification(model: AIModel) {
  const dates: string[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.checkedAt === "string" && typeof record.url === "string") dates.push(record.checkedAt);
      else Object.values(record).forEach(visit);
    }
  };
  visit(model);
  return dates.sort().at(-1) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Lightweight summaries for client components                                 */
/* -------------------------------------------------------------------------- */

export interface ProviderSummary {
  id: string;
  slug: string;
  name: string;
  kind: ProviderKind;
  color: string;
  logo: string;
  country: string | null;
  modelCount: number;
}

export interface ModelSummary {
  id: string;
  slug: string;
  name: string;
  providerId: string;
  path: string;
  family: string;
  description: string;
  categories: ModelCategory[];
  status: ModelStatus;
  released: string | null;
  lastChange: { date: string; type: ModelEventType } | null;
  context: number | null;
  maxOutput: number | null;
  input: number | null;
  cachedInput: number | null;
  output: number | null;
  otherPrice: string | null;
  openness: Openness | null;
  api: boolean | null;
  free: boolean | null;
  caps: Capability[];
  tags: string[];
  bestFor: UseCase[];
  rank: number;
  trending: boolean;
  trendReason: string | null;
  priceCheckedAt: string | null;
  benchmarkCount: number;
}

export function toProviderSummary(catalog: Catalog, provider: Provider): ProviderSummary {
  return {
    id: provider.id,
    slug: provider.slug,
    name: provider.name,
    kind: provider.kind,
    color: provider.color,
    logo: provider.logo,
    country: provider.country,
    modelCount: catalog.models.filter((model) => model.providerId === provider.id).length,
  };
}

export function toModelSummary(catalog: Catalog, model: AIModel): ModelSummary {
  const provider = getProvider(catalog, model.providerId);
  return {
    id: model.id,
    slug: model.slug,
    name: model.name,
    providerId: model.providerId,
    path: modelPath(provider.slug, model.slug),
    family: model.family,
    description: model.description.length > 220 ? `${model.description.slice(0, 217).trimEnd()}…` : model.description,
    categories: model.categories,
    status: model.status,
    released: model.releaseDate.value,
    lastChange: lastChange(model),
    context: model.contextWindow.value,
    maxOutput: model.maxOutput.value,
    input: model.pricing.input.value,
    cachedInput: model.pricing.cachedInput.value,
    output: model.pricing.output.value,
    otherPrice: model.pricing.other.value,
    openness: model.openness.value,
    api: model.apiAvailable.value,
    free: model.freeAccess.value,
    caps: trueCapabilities(model),
    tags: model.tags,
    bestFor: model.bestFor,
    rank: model.editorial.rank,
    trending: model.editorial.trending,
    trendReason: model.editorial.trending ? model.editorial.rationale : null,
    priceCheckedAt: latestPriceCheck(model),
    benchmarkCount: model.benchmarks.length,
  };
}

export function summarizeCatalog(catalog: Catalog) {
  return {
    models: catalog.models.map((model) => toModelSummary(catalog, model)),
    providers: catalog.providers.map((provider) => toProviderSummary(catalog, provider)),
  };
}

/* -------------------------------------------------------------------------- */
/* Badges                                                                      */
/* -------------------------------------------------------------------------- */

export type BadgeKind = "new" | "updated" | "preview" | "open-weights" | "open-source" | "deprecated" | "retired";

export const badgeLabels: Record<BadgeKind, string> = {
  new: "New",
  updated: "Updated",
  preview: "Preview",
  "open-weights": "Open weights",
  "open-source": "Open source",
  deprecated: "Deprecated",
  retired: "Retired",
};

export const NEW_WINDOW_DAYS = 45;
export const UPDATED_WINDOW_DAYS = 30;

export function isNew(model: Pick<ModelSummary, "released">, referenceDate: string) {
  if (!model.released) return false;
  const days = daysBetween(model.released, referenceDate);
  return days >= 0 && days <= NEW_WINDOW_DAYS;
}

export function modelBadges(model: ModelSummary, referenceDate: string): BadgeKind[] {
  const badges: BadgeKind[] = [];
  if (model.status === "retired") badges.push("retired");
  else if (model.status === "deprecated") badges.push("deprecated");
  else if (model.status === "preview") badges.push("preview");
  if (model.status !== "retired" && isNew(model, referenceDate)) badges.push("new");
  else if (model.lastChange) {
    const days = daysBetween(model.lastChange.date, referenceDate);
    if (days >= 0 && days <= UPDATED_WINDOW_DAYS && model.lastChange.type !== "deprecation" && model.lastChange.type !== "retirement") badges.push("updated");
  }
  if (model.openness === "open-source") badges.push("open-source");
  else if (model.openness === "open-weights") badges.push("open-weights");
  return badges;
}

/* -------------------------------------------------------------------------- */
/* Explore filters                                                             */
/* -------------------------------------------------------------------------- */

export const SORTS = {
  featured: "Featured",
  trending: "Trending",
  newest: "Newest",
  updated: "Recently updated",
  price: "Lowest API price",
  context: "Largest context",
  name: "Alphabetical",
} as const;
export type SortKey = keyof typeof SORTS;

export const AVAILABILITY = { api: "API", "open-weights": "Open weights", "self-host": "Self-hostable", free: "Free access" } as const;
export type AvailabilityKey = keyof typeof AVAILABILITY;

export const MODALITIES = { text: "Text", "image-input": "Image input", "image-output": "Image output", audio: "Audio", video: "Video" } as const;
export type ModalityKey = keyof typeof MODALITIES;

export const STATUS_FILTERS = { new: "New", active: "Active", preview: "Preview", deprecated: "Deprecated", retired: "Retired" } as const;
export type StatusFilter = keyof typeof STATUS_FILTERS;

export const PRICE_FILTERS = { free: "Free", "0.5": "Under $0.50", "1": "Under $1", "5": "Under $5", "10": "Under $10", custom: "Non-token pricing" } as const;
export type PriceFilter = keyof typeof PRICE_FILTERS;

export const CONTEXT_FILTERS = { "100000": "100K+", "500000": "500K+", "1000000": "1M+", "5000000": "5M+" } as const;
export type ContextFilter = keyof typeof CONTEXT_FILTERS;

export interface ExploreState {
  q: string;
  providers: string[];
  categories: ModelCategory[];
  availability: AvailabilityKey[];
  modalities: ModalityKey[];
  status: StatusFilter[];
  price: PriceFilter | null;
  context: ContextFilter | null;
  sort: SortKey;
  view: "grid" | "table";
}

export const defaultExploreState: ExploreState = {
  q: "", providers: [], categories: [], availability: [], modalities: [], status: [],
  price: null, context: null, sort: "featured", view: "grid",
};

type ParamsLike = { get(name: string): string | null };

function list<T extends string>(params: ParamsLike, key: string, allowed: readonly T[] | ((value: string) => boolean)) {
  const raw = params.get(key);
  if (!raw) return [];
  const test = typeof allowed === "function" ? allowed : (value: string) => (allowed as readonly string[]).includes(value);
  return [...new Set(raw.split(",").map((value) => value.trim()).filter(test))] as T[];
}

export function parseExploreState(params: ParamsLike, categories: readonly ModelCategory[], providerIds: readonly string[]): ExploreState {
  const sort = params.get("sort");
  const price = params.get("price");
  const context = params.get("context");
  return {
    q: (params.get("q") ?? "").slice(0, 120),
    providers: list(params, "provider", providerIds),
    categories: list(params, "category", categories),
    availability: list(params, "availability", Object.keys(AVAILABILITY) as AvailabilityKey[]),
    modalities: list(params, "modality", Object.keys(MODALITIES) as ModalityKey[]),
    status: list(params, "status", Object.keys(STATUS_FILTERS) as StatusFilter[]),
    price: price && price in PRICE_FILTERS ? (price as PriceFilter) : null,
    context: context && context in CONTEXT_FILTERS ? (context as ContextFilter) : null,
    sort: sort && sort in SORTS ? (sort as SortKey) : "featured",
    view: params.get("view") === "table" ? "table" : "grid",
  };
}

export function serializeExploreState(state: ExploreState) {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.providers.length) params.set("provider", state.providers.join(","));
  if (state.categories.length) params.set("category", state.categories.join(","));
  if (state.availability.length) params.set("availability", state.availability.join(","));
  if (state.modalities.length) params.set("modality", state.modalities.join(","));
  if (state.status.length) params.set("status", state.status.join(","));
  if (state.price) params.set("price", state.price);
  if (state.context) params.set("context", state.context);
  if (state.sort !== "featured") params.set("sort", state.sort);
  if (state.view !== "grid") params.set("view", state.view);
  return params.toString();
}

export function activeFilterCount(state: ExploreState) {
  return state.providers.length + state.categories.length + state.availability.length +
    state.modalities.length + state.status.length + (state.price ? 1 : 0) + (state.context ? 1 : 0);
}

export function matchesFilters(model: ModelSummary, state: ExploreState, referenceDate: string) {
  if (state.providers.length && !state.providers.includes(model.providerId)) return false;
  if (state.categories.length && !state.categories.some((category) => model.categories.includes(category))) return false;
  const has = (cap: Capability) => model.caps.includes(cap);
  for (const availability of state.availability) {
    if (availability === "api" && model.api !== true) return false;
    if (availability === "open-weights" && !isOpenModel(model.openness)) return false;
    if (availability === "self-host" && !has("selfHosting")) return false;
    if (availability === "free" && model.free !== true && model.input !== 0) return false;
  }
  for (const modality of state.modalities) {
    if (modality === "text" && !has("text")) return false;
    if (modality === "image-input" && !has("imageInput")) return false;
    if (modality === "image-output" && !has("imageOutput") && !has("imageEditing")) return false;
    if (modality === "audio" && !has("audioInput") && !has("audioOutput")) return false;
    if (modality === "video" && !has("videoInput") && !has("videoOutput")) return false;
  }
  if (state.status.length) {
    const ok = state.status.some((status) => status === "new" ? isNew(model, referenceDate) && model.status !== "retired" : model.status === status);
    if (!ok) return false;
  } else if (model.status === "retired") {
    // Retired models stay searchable and reachable, but are hidden from the default listing.
    if (!state.q.trim()) return false;
  }
  if (state.price) {
    if (state.price === "free" && !(model.input === 0 || model.free === true)) return false;
    if (state.price === "custom" && !(model.input === null && model.otherPrice)) return false;
    if (!["free", "custom"].includes(state.price) && !(model.input !== null && model.input < Number(state.price))) return false;
  }
  if (state.context && !(model.context !== null && model.context >= Number(state.context))) return false;
  return true;
}

export function sortModels<T extends ModelSummary>(models: T[], sort: SortKey): T[] {
  return [...models].sort((a, b) => {
    switch (sort) {
      case "trending":
        return Number(b.trending) - Number(a.trending) || (b.released ?? "").localeCompare(a.released ?? "") || a.rank - b.rank;
      case "newest":
        return (b.released ?? "").localeCompare(a.released ?? "") || a.rank - b.rank;
      case "updated":
        return (b.lastChange?.date ?? b.released ?? "").localeCompare(a.lastChange?.date ?? a.released ?? "") || a.rank - b.rank;
      case "price":
        return (a.input ?? Infinity) - (b.input ?? Infinity) || (a.output ?? Infinity) - (b.output ?? Infinity) || a.rank - b.rank;
      case "context":
        return (b.context ?? -1) - (a.context ?? -1) || a.rank - b.rank;
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return a.rank - b.rank;
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[-_/.·]+/g, " ").replace(/\s+/g, " ").trim();
}

function editDistanceAtMostOne(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    // Allow one adjacent transposition ("visoin" → "vision").
    const diffs: number[] = [];
    for (let index = 0; index < a.length && diffs.length <= 2; index++) if (a[index] !== b[index]) diffs.push(index);
    if (diffs.length === 2 && diffs[1] === diffs[0] + 1 && a[diffs[0]] === b[diffs[1]] && a[diffs[1]] === b[diffs[0]]) return true;
  }
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

interface Intent {
  label: string;
  test: (model: ModelSummary) => boolean;
}

const INTENTS: [RegExp, (match: RegExpMatchArray) => Intent][] = [
  [/\b(?:cheap|cheapest|affordable|budget|low cost|inexpensive)\b/, () => ({ label: "Input under $1/1M", test: (m) => m.input !== null && m.input <= 1 })],
  [/\bfree\b/, () => ({ label: "Free access", test: (m) => m.free === true || m.input === 0 })],
  [/\b(\d+(?:\.\d+)?)\s*(k|m)\b(?:\s*(?:\+|plus|tokens?|context|window))*/, (match) => {
    const amount = Number(match[1]) * (match[2] === "m" ? 1_000_000 : 1_000);
    return { label: `${formatTokens(amount)}+ context`, test: (m) => m.context !== null && m.context >= amount };
  }],
  [/\b(?:long|large|huge|big) context(?: window)?\b/, () => ({ label: "200K+ context", test: (m) => m.context !== null && m.context >= 200_000 })],
  [/\bopen (?:source|weights?|models?)\b|\bopen\b/, () => ({ label: "Open weights", test: (m) => isOpenModel(m.openness) })],
  [/\b(?:self host(?:ed|ing)?|local|on prem(?:ise)?|privacy)\b/, () => ({ label: "Self-hostable", test: (m) => m.caps.includes("selfHosting") })],
  [/\bimage (?:generation|gen|models?)\b|\btext to image\b/, () => ({ label: "Image generation", test: (m) => m.caps.includes("imageOutput") || m.categories.includes("image-generation") })],
  [/\bvideo (?:generation|gen|models?)\b|\btext to video\b/, () => ({ label: "Video generation", test: (m) => m.caps.includes("videoOutput") || m.categories.includes("video-generation") })],
  [/\b(?:vision|images?|visual|multimodal vision)\b/, () => ({ label: "Vision / image", test: (m) => m.caps.includes("imageInput") || m.caps.includes("imageOutput") })],
  [/\bvideos?\b/, () => ({ label: "Video", test: (m) => m.caps.includes("videoInput") || m.caps.includes("videoOutput") })],
  [/\b(?:speech to text|transcription|transcribe|asr|stt)\b/, () => ({ label: "Speech-to-text", test: (m) => m.categories.includes("speech-to-text") })],
  [/\b(?:text to speech|tts)\b/, () => ({ label: "Text-to-speech", test: (m) => m.categories.includes("text-to-speech") })],
  [/\b(?:realtime|real time|live voice)\b/, () => ({ label: "Realtime", test: (m) => m.caps.includes("realtime") || m.categories.includes("realtime-voice") })],
  [/\b(?:audio|voice|speech)\b/, () => ({ label: "Audio / voice", test: (m) => m.caps.includes("audioInput") || m.caps.includes("audioOutput") || m.categories.some((c) => ["speech-to-text", "text-to-speech", "realtime-voice"].includes(c)) })],
  [/\bmusic\b/, () => ({ label: "Music", test: (m) => m.categories.includes("music-generation") })],
  [/\bembeddings?\b/, () => ({ label: "Embeddings", test: (m) => m.categories.includes("embeddings") || m.caps.includes("embeddings") })],
  [/\bocr\b/, () => ({ label: "OCR", test: (m) => m.categories.includes("ocr") })],
  [/\bcomputer use\b/, () => ({ label: "Computer use", test: (m) => m.caps.includes("computerUse") || m.categories.includes("computer-use") })],
  [/\b(?:tools?|function calling|tool calling)\b/, () => ({ label: "Tool calling", test: (m) => m.caps.includes("toolCalling") })],
  [/\b(?:agents?|agentic)\b/, () => ({ label: "Agentic", test: (m) => m.categories.includes("agentic") || m.bestFor.includes("agents") })],
  [/\b(?:reasoning|thinking)\b/, () => ({ label: "Reasoning", test: (m) => m.caps.includes("reasoning") || m.categories.includes("reasoning") })],
  [/\b(?:coding|code|coder|programming|developer)\b/, () => ({ label: "Coding", test: (m) => m.caps.includes("coding") || m.categories.includes("coding") || m.bestFor.includes("coding") })],
  [/\b(?:research|deep research|web search|search)\b/, () => ({ label: "Search / research", test: (m) => m.caps.includes("webSearch") || m.categories.includes("search") })],
  [/\bmultimodal\b/, () => ({ label: "Multimodal", test: (m) => modalitiesFromCaps(m.caps).length > 1 || m.categories.includes("multimodal") })],
  [/\bapi\b/, () => ({ label: "API available", test: (m) => m.api === true })],
];

const STOP_WORDS = new Set(["ai", "model", "models", "llm", "llms", "with", "for", "the", "and", "a", "an", "best", "top", "that", "supports", "support", "window", "tokens", "token", "by", "of", "in", "to"]);

export interface ParsedQuery {
  intents: Intent[];
  terms: string[];
}

export function parseQuery(query: string): ParsedQuery {
  let text = normalize(query);
  const intents: Intent[] = [];
  for (const [pattern, build] of INTENTS) {
    const match = text.match(pattern);
    if (match) {
      intents.push(build(match));
      text = text.replace(pattern, " ");
    }
  }
  const terms = text.split(" ").filter((term) => term && !STOP_WORDS.has(term));
  return { intents, terms };
}

function termScore(term: string, fields: string[]) {
  let best = 0;
  for (const [index, field] of fields.entries()) {
    const weight = index === 0 ? 1 : index === 1 ? 0.8 : 0.5;
    if (!field) continue;
    if (field === term) best = Math.max(best, 10 * weight);
    else if (field.startsWith(term)) best = Math.max(best, 8 * weight);
    else if (field.split(" ").some((word) => word.startsWith(term))) best = Math.max(best, 7 * weight);
    else if (field.includes(term)) best = Math.max(best, 5 * weight);
    else if (term.length >= 4 && field.split(" ").some((word) => editDistanceAtMostOne(word, term))) best = Math.max(best, 3 * weight);
  }
  return best;
}

export function searchModels(models: ModelSummary[], providers: ProviderSummary[], query: string) {
  const { intents, terms } = parseQuery(query);
  const providerName = new Map(providers.map((provider) => [provider.id, normalize(provider.name)]));
  const scored: { model: ModelSummary; score: number }[] = [];
  for (const model of models) {
    if (!intents.every((intent) => intent.test(model))) continue;
    let score = 0;
    let matchedAll = true;
    const fields = [
      normalize(model.name),
      `${providerName.get(model.providerId) ?? ""} ${normalize(model.family)} ${normalize(model.slug)}`,
      normalize([...model.tags, ...model.categories.map((category) => categoryLabels[category]), model.description].join(" ")),
    ];
    for (const term of terms) {
      const value = termScore(term, fields);
      if (!value) { matchedAll = false; break; }
      score += value;
    }
    if (!matchedAll) continue;
    // Prefer current models and editorial order when relevance ties.
    const statusPenalty = model.status === "retired" ? 4 : model.status === "deprecated" ? 2 : 0;
    scored.push({ model, score: score - statusPenalty - model.rank / 10_000 });
  }
  return {
    intents: intents.map((intent) => intent.label),
    results: scored.sort((a, b) => b.score - a.score).map((entry) => entry.model),
  };
}

export function searchProviders(providers: ProviderSummary[], query: string) {
  const q = normalize(query);
  if (!q) return [];
  return providers
    .map((provider) => ({ provider, score: termScore(q, [normalize(provider.name), normalize(provider.id)]) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.provider);
}

/* -------------------------------------------------------------------------- */
/* Collections (category landing pages)                                       */
/* -------------------------------------------------------------------------- */

export interface Collection {
  slug: string;
  title: string;
  heading: string;
  description: string;
  defaultSort: SortKey;
  /** Pre-applied explore filters for the interactive list on the page. */
  preset: Partial<ExploreState>;
  match: (model: ModelSummary) => boolean;
}

const categoryCollection = (category: ModelCategory, heading: string, description: string, defaultSort: SortKey = "featured"): Collection => ({
  slug: category,
  title: categoryLabels[category],
  heading,
  description,
  defaultSort,
  preset: { categories: [category] },
  match: (model) => model.categories.includes(category),
});

export const collections: Collection[] = [
  categoryCollection("coding", "AI models for coding", "Models whose providers document code generation, code editing, or software-agent use. Compare API pricing, context windows, and published coding benchmarks."),
  categoryCollection("reasoning", "Reasoning models", "Models with documented extended reasoning or thinking modes. Reasoning tokens are often billed as output — check pricing notes."),
  categoryCollection("agentic", "Agentic AI models", "Models documented for multi-step tool use and autonomous agent workflows."),
  categoryCollection("general", "General-purpose LLMs", "Broad language models for chat, writing, analysis, and everyday work."),
  categoryCollection("search", "Search & research AI models", "Models and systems designed around web search, retrieval, or deep research."),
  categoryCollection("image-generation", "AI image generation models", "Text-to-image models compared by provider, pricing unit, licensing, and API access.", "newest"),
  categoryCollection("image-editing", "AI image editing models", "Models that edit or transform existing images from instructions.", "newest"),
  categoryCollection("video-generation", "AI video generation models", "Text-to-video and image-to-video models with API and pricing details.", "newest"),
  categoryCollection("speech-to-text", "Speech-to-text models", "Transcription and speech-recognition models compared by provider and pricing."),
  categoryCollection("text-to-speech", "Text-to-speech models", "Voice generation models for narration, assistants, and accessibility."),
  categoryCollection("realtime-voice", "Realtime voice models", "Low-latency speech-to-speech and live conversational voice models."),
  categoryCollection("music-generation", "AI music generation models", "Models that generate music or audio from prompts."),
  categoryCollection("embeddings", "Embedding models", "Text and multimodal embedding models for search, retrieval, and RAG.", "price"),
  categoryCollection("ocr", "OCR models", "Document and image text-extraction models."),
  categoryCollection("computer-use", "Computer-use models", "Models that operate graphical interfaces through screenshots and actions."),
  categoryCollection("robotics", "Robotics models", "Models for embodied reasoning and robot control."),
  categoryCollection("vision", "Vision models", "Models specialized in image and visual understanding."),
  categoryCollection("multimodal", "Multimodal AI models", "Models that accept or produce more than one modality — text, image, audio, or video."),
  categoryCollection("moderation", "Safety & moderation models", "Classifiers and guard models for content safety."),
  {
    slug: "open-source", title: "Open source & open-weight", heading: "Open-source and open-weight AI models",
    description: "Models with downloadable weights. Open weights are not always open source — licenses and usage conditions vary, so each license is linked.",
    defaultSort: "newest", preset: { availability: ["open-weights"] },
    match: (model) => isOpenModel(model.openness),
  },
  {
    slug: "long-context", title: "Long context (1M+)", heading: "AI models with 1M+ token context windows",
    description: "Models with a published context window of at least one million tokens. Long-context pricing tiers often differ — check the notes on each model.",
    defaultSort: "context", preset: { context: "1000000" },
    match: (model) => model.context !== null && model.context >= 1_000_000,
  },
  {
    slug: "cheap-api", title: "Low-cost APIs", heading: "Low-cost AI APIs",
    description: "Models with a published standard input price under $1 per million tokens. Output, caching, and tool fees still apply — use the calculator for real workloads.",
    defaultSort: "price", preset: { price: "1", sort: "price" },
    match: (model) => model.input !== null && model.input < 1 && model.status !== "retired",
  },
  {
    slug: "voice", title: "Voice & audio", heading: "AI voice models",
    description: "Speech-to-text, text-to-speech, and realtime voice models in one place.",
    defaultSort: "featured", preset: { categories: ["speech-to-text", "text-to-speech", "realtime-voice"] },
    match: (model) => model.categories.some((category) => ["speech-to-text", "text-to-speech", "realtime-voice"].includes(category)),
  },
];

export function getCollection(slug: string) {
  return collections.find((collection) => collection.slug === slug) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Comparisons                                                                 */
/* -------------------------------------------------------------------------- */

export function resolveComparison(catalog: Catalog, slug: string) {
  const slugs = slug.split("-vs-");
  if (slugs.length < 2 || slugs.length > 4 || new Set(slugs).size !== slugs.length) return null;
  const models = slugs.map((value) => catalog.models.find((model) => model.slug === value));
  if (models.some((model) => !model)) return null;
  return models as AIModel[];
}

export interface PopularComparison {
  title: string;
  models: [ModelSummary, ModelSummary];
}

const COMPARISON_PAIRS: [string, string, string][] = [
  ["openai", "anthropic", "GPT vs Claude"],
  ["openai", "google", "GPT vs Gemini"],
  ["anthropic", "google", "Claude vs Gemini"],
  ["xai", "openai", "Grok vs GPT"],
  ["deepseek", "anthropic", "DeepSeek vs Claude"],
  ["meta", "qwen", "Llama vs Qwen"],
  ["mistral", "meta", "Mistral vs Llama"],
  ["deepseek", "qwen", "DeepSeek vs Qwen"],
];

/** Flagship-to-flagship starting points derived from the catalog's editorial order. */
export function popularComparisons(models: ModelSummary[]): PopularComparison[] {
  const flagship = (providerId: string) => sortModels(
    models.filter((model) => model.providerId === providerId && model.status === "active" &&
      model.categories.some((category) => ["general", "reasoning", "coding"].includes(category))),
    "featured",
  )[0];
  return COMPARISON_PAIRS.flatMap(([a, b, title]) => {
    const first = flagship(a);
    const second = flagship(b);
    return first && second ? [{ title, models: [first, second] as [ModelSummary, ModelSummary] }] : [];
  });
}

/** Comparisons worth indexing: popular pairs plus same-provider flagship pairs. */
export function indexableComparisons(models: ModelSummary[]) {
  const set = new Map<string, string[]>();
  for (const pair of popularComparisons(models)) {
    const slugs = canonicalComparisonSlugs(pair.models.map((model) => model.slug));
    set.set(slugs.join("|"), slugs);
  }
  const leaders = sortModels(models.filter((model) => model.status === "active" && model.rank <= 15), "featured");
  for (let i = 0; i < leaders.length; i++) {
    for (let j = i + 1; j < leaders.length; j++) {
      const slugs = canonicalComparisonSlugs([leaders[i].slug, leaders[j].slug]);
      set.set(slugs.join("|"), slugs);
    }
  }
  return [...set.values()];
}

/* -------------------------------------------------------------------------- */
/* Cost calculator                                                             */
/* -------------------------------------------------------------------------- */

export interface Workload {
  inputTokens: number;
  outputTokens: number;
  requestsPerDay: number;
  cachedShare: number;
}

export const defaultWorkload: Workload = { inputTokens: 2_000, outputTokens: 500, requestsPerDay: 1_000, cachedShare: 0 };

export function estimateCost(model: Pick<ModelSummary, "input" | "output" | "cachedInput">, workload: Workload) {
  if (model.input === null || model.output === null) return null;
  const cached = Math.min(Math.max(workload.cachedShare, 0), 1);
  const cachedRate = model.cachedInput ?? model.input;
  const perRequest = (
    workload.inputTokens * (1 - cached) * model.input +
    workload.inputTokens * cached * cachedRate +
    workload.outputTokens * model.output
  ) / 1_000_000;
  const perDay = perRequest * workload.requestsPerDay;
  return { perRequest, perDay, perMonth: perDay * 30, usedCachedFallback: cached > 0 && model.cachedInput === null };
}

/* -------------------------------------------------------------------------- */
/* Finder                                                                      */
/* -------------------------------------------------------------------------- */

export const FINDER_TASKS = {
  coding: "Coding", research: "Research", writing: "Writing", business: "Business", agents: "Agents",
  image: "Image generation", video: "Video", voice: "Voice", data: "Data analysis", general: "General use",
} as const;
export type FinderTask = keyof typeof FINDER_TASKS;

export const FINDER_PRIORITIES = {
  quality: "Quality", cost: "Low API cost", speed: "Speed", context: "Long context", open: "Open source",
  privacy: "Privacy", multimodal: "Multimodal", "self-host": "Self hosting",
} as const;
export type FinderPriority = keyof typeof FINDER_PRIORITIES;

export const FINDER_API = { yes: "Yes", no: "No", either: "Either" } as const;
export type FinderApi = keyof typeof FINDER_API;

export const FINDER_BUDGET = { free: "Free", low: "Low", medium: "Medium", premium: "Premium", any: "No preference" } as const;
export type FinderBudget = keyof typeof FINDER_BUDGET;

export interface FinderAnswers {
  task: FinderTask;
  priority: FinderPriority;
  api: FinderApi;
  budget: FinderBudget;
}

const taskMatchers: Record<FinderTask, { test: (m: ModelSummary) => boolean; reason: (m: ModelSummary) => string }> = {
  coding: { test: (m) => m.categories.includes("coding") || m.caps.includes("coding") || m.bestFor.includes("coding"), reason: () => "Documented for coding (category or capability)." },
  research: { test: (m) => m.categories.includes("search") || m.bestFor.includes("research") || m.caps.includes("webSearch"), reason: (m) => m.categories.includes("search") ? "A search/research model." : "Documented for research or web search." },
  writing: { test: (m) => m.bestFor.includes("writing") || (m.categories.includes("general") && m.caps.includes("text")), reason: () => "A general-purpose text model suited to writing." },
  business: { test: (m) => m.bestFor.includes("business") || m.categories.includes("general"), reason: () => "A general-purpose model listed for business work." },
  agents: { test: (m) => m.categories.includes("agentic") || m.bestFor.includes("agents") || (m.caps.includes("toolCalling") && m.caps.includes("reasoning")), reason: (m) => m.categories.includes("agentic") ? "Categorized as an agentic model." : "Supports tool calling for agent workflows." },
  image: { test: (m) => m.categories.includes("image-generation") || m.caps.includes("imageOutput"), reason: () => "Generates images." },
  video: { test: (m) => m.categories.includes("video-generation") || m.caps.includes("videoOutput"), reason: () => "Generates video." },
  voice: { test: (m) => m.categories.some((c) => ["speech-to-text", "text-to-speech", "realtime-voice"].includes(c)), reason: (m) => `A ${m.categories.filter((c) => ["speech-to-text", "text-to-speech", "realtime-voice"].includes(c)).map((c) => categoryLabels[c].toLowerCase()).join(" / ")} model.` },
  data: { test: (m) => m.bestFor.includes("data-analysis") || (m.caps.includes("reasoning") && m.caps.includes("text")), reason: () => "Documented reasoning support for analytical work." },
  general: { test: (m) => m.categories.includes("general") || m.categories.includes("multimodal"), reason: () => "A general-purpose model." },
};

export function recommendModels(models: ModelSummary[], answers: FinderAnswers) {
  const task = taskMatchers[answers.task];
  let pool = models.filter((model) => model.status !== "retired" && model.status !== "deprecated" && task.test(model));
  const notes: string[] = [];

  if (answers.api === "yes") pool = pool.filter((model) => model.api === true);

  const tokenPriced = (model: ModelSummary) => model.input !== null;
  if (answers.budget === "free") pool = pool.filter((model) => model.free === true || model.input === 0 || isOpenModel(model.openness));
  if (answers.budget === "low") pool = pool.filter((model) => !tokenPriced(model) || model.input! <= 1);
  if (answers.budget === "medium") pool = pool.filter((model) => !tokenPriced(model) || model.input! <= 5);

  if (answers.priority === "open") pool = pool.filter((model) => isOpenModel(model.openness));
  if (answers.priority === "self-host" || answers.priority === "privacy") pool = pool.filter((model) => model.caps.includes("selfHosting"));
  if (answers.priority === "multimodal") pool = pool.filter((model) => modalitiesFromCaps(model.caps).length > 1);
  if (answers.priority === "context") pool = pool.filter((model) => model.context !== null);
  if (answers.priority === "cost") pool = pool.filter(tokenPriced);
  if (answers.priority === "speed") notes.push("We don't yet record independent latency measurements, so speed isn't used to rank results. Results follow our editorial order — test latency with your own workload.");
  if (answers.priority === "quality") notes.push("\"Quality\" follows our editorial featured order, not a universal ranking. Compare benchmarks on each model's page for your task.");

  const sort: SortKey = answers.priority === "cost" ? "price" : answers.priority === "context" ? "context" : "featured";
  const ordered = sortModels(pool, sort);
  // Keep the shortlist diverse across providers.
  const picked: ModelSummary[] = [];
  for (const model of ordered) {
    if (picked.length >= 5) break;
    if (picked.filter((entry) => entry.providerId === model.providerId).length >= 2) continue;
    picked.push(model);
  }

  return {
    notes,
    results: picked.map((model) => {
      const reasons = [task.reason(model)];
      if (answers.api === "yes") reasons.push("A first-party API is documented.");
      if (answers.priority === "cost" && model.input !== null) reasons.push(`Published input price ${formatPrice(model.input)}/1M tokens${model.output !== null ? `, output ${formatPrice(model.output)}/1M` : ""}.`);
      if (answers.priority === "context" && model.context !== null) reasons.push(`${formatTokens(model.context)}-token context window.`);
      if (answers.priority === "open" || answers.priority === "self-host" || answers.priority === "privacy") reasons.push(`${model.openness ? opennessLabels[model.openness] : "Downloadable"} weights you can run on your own infrastructure (check the license).`);
      if (answers.priority === "multimodal") reasons.push(`Supports ${modalitiesFromCaps(model.caps).join(", ").toLowerCase()}.`);
      if (answers.budget === "free") reasons.push(model.free === true ? "A free access path is documented." : "Downloadable weights — no per-token API fee, but you pay for infrastructure.");
      if ((answers.budget === "low" || answers.budget === "medium") && model.input !== null) reasons.push(`Within your budget at ${formatPrice(model.input)}/1M input tokens.`);
      if ((answers.budget === "low" || answers.budget === "medium") && model.input === null) reasons.push("Not priced per token — check the non-token pricing on its page.");
      return { model, reasons };
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Release feed                                                                */
/* -------------------------------------------------------------------------- */

export interface FeedEvent {
  id: string;
  date: string;
  type: ModelEventType;
  title: string;
  description: string;
  sourceUrl: string;
  sourceLabel: string;
  modelSlug: string;
  modelName: string;
  modelPath: string;
  providerId: string;
}

export function catalogEvents(catalog: Catalog, untilDate?: string): FeedEvent[] {
  const providerSlug = new Map(catalog.providers.map((provider) => [provider.id, provider.slug]));
  return catalog.models
    .flatMap((model) => model.releases.map((event) => ({
      id: event.id,
      date: event.date,
      type: event.type,
      title: event.title,
      description: event.description,
      sourceUrl: event.source.url,
      sourceLabel: event.source.label,
      modelSlug: model.slug,
      modelName: model.name,
      modelPath: modelPath(providerSlug.get(model.providerId) ?? model.providerId, model.slug),
      providerId: model.providerId,
    })))
    .filter((event) => !untilDate || event.date <= untilDate.slice(0, 10))
    .sort((a, b) => b.date.localeCompare(a.date) || a.modelName.localeCompare(b.modelName));
}

export function catalogStats(catalog: Catalog) {
  const sources = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.url === "string" && typeof record.checkedAt === "string") sources.add(record.url);
      else Object.values(record).forEach(visit);
    }
  };
  visit(catalog.models);
  visit(catalog.providers);
  return {
    models: catalog.models.length,
    activeModels: catalog.models.filter((model) => model.status === "active" || model.status === "preview").length,
    providers: catalog.providers.length,
    sources: sources.size,
    benchmarks: catalog.models.reduce((total, model) => total + model.benchmarks.length, 0),
  };
}
