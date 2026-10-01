/**
 * Authoring helpers for the reference catalog.
 *
 * Provider files under src/data/providers describe only facts that were verified
 * in a cited source. Every omitted field becomes an explicit unknown
 * ("Not publicly disclosed"), never a guess, zero, or false.
 */
import {
  CAPABILITIES,
  type AIModel,
  type BenchmarkDefinition,
  type BenchmarkResult,
  type Capability,
  type Fact,
  type ModelCategory,
  type ModelEventType,
  type ModelRelease,
  type ModelStatus,
  type Openness,
  type Provider,
  type ProviderKind,
  type Source,
  type UseCase,
} from "../lib/types";

/** Default check date for the reference snapshot. */
export const CHECKED = "2026-10-01";

export function src(label: string, url: string, checkedAt: string = CHECKED): Source {
  return { label, url, checkedAt };
}

/**
 * A verified value. Use the bare value when the model's primary `source` proves it,
 * or `{ v, s, n }` to cite a different source (`s`) or add a clarifying note (`n`).
 * `{ v: null, n: "..." }` records an explicit unknown with an explanation.
 */
export type V<T> = T | { v: T | null; s?: Source; n?: string };

export interface BenchmarkInput {
  /** ID from src/data/benchmarks.ts (or an extraBenchmarks entry in the same file). */
  benchmark: string;
  score: number;
  display?: string;
  version?: string;
  /** YYYY-MM-DD of the evaluation or publication of the result. */
  date: string;
  conditions?: string;
  reportedBy: "provider" | "independent";
  source: Source;
}

export interface EventInput {
  date: string;
  type: ModelEventType;
  title: string;
  description: string;
  source: Source;
}

export interface ModelInput {
  /** Stable lowercase kebab-case ID; also used as the URL slug. Never reuse for another model. */
  id: string;
  name: string;
  /** Provider ID defined in the same or another provider file. */
  provider: string;
  /** Family used for version timelines, e.g. "GPT-6", "Claude 5", "Gemini 3". */
  family: string;
  /** API model identifier or checkpoint name exactly as published. */
  version: string;
  /** First entry is the primary category. */
  categories: ModelCategory[];
  status: ModelStatus;
  /** 1-3 factual sentences. No marketing superlatives. */
  description: string;
  /** Primary official source; facts given as bare values cite this source. */
  source: Source;
  released?: V<string>;
  cutoff?: V<string>;
  context?: V<number>;
  maxOutput?: V<number>;
  openness?: V<Openness>;
  license?: V<string>;
  api?: V<boolean>;
  free?: V<boolean>;
  languages?: V<string>;
  price?: {
    /** USD per 1M input tokens, standard tier. */
    input?: V<number>;
    cachedInput?: V<number>;
    output?: V<number>;
    /** Verbatim non-token pricing, e.g. "$0.04 per image (1024x1024)". */
    other?: V<string>;
    /** Applied to every price fact that has no own note. */
    note?: string;
  };
  caps?: Partial<Record<Capability, V<boolean>>>;
  website?: string;
  apiDocs?: string | null;
  bestFor?: UseCase[];
  tags?: string[];
  benchmarks?: BenchmarkInput[];
  events?: EventInput[];
  /** Only with a public, citable signal (e.g. a launch announcement or public ranking). */
  trending?: { reason: string; source: Source };
}

export interface ProviderInput {
  id: string;
  name: string;
  kind: ProviderKind;
  description: string;
  website: string;
  country?: string | null;
  founded?: number | null;
  /** Six-digit brand hex color used for small accents only. */
  color: string;
  /** Local /logos/<file>.svg path, or "" for a monogram. */
  logo?: string;
  products: { name: string; description: string; url: string }[];
  sources: Source[];
}

export interface ProviderFile {
  providers: ProviderInput[];
  models: ModelInput[];
  extraBenchmarks?: BenchmarkDefinition[];
}

const UNKNOWN_NOTE = "Not publicly disclosed in the checked official sources.";

function isWrapped<T>(value: V<T>): value is { v: T | null; s?: Source; n?: string } {
  return typeof value === "object" && value !== null && "v" in value;
}

function toFact<T>(input: V<T> | undefined, fallback: Source, note?: string): Fact<T> {
  if (input === undefined) return { value: null, source: null, updatedAt: CHECKED, note: UNKNOWN_NOTE };
  if (isWrapped(input)) {
    const source = input.s ?? fallback;
    const n = input.n ?? note;
    if (input.v === null) {
      return { value: null, source: input.s ?? null, updatedAt: source.checkedAt, note: n ?? UNKNOWN_NOTE };
    }
    return { value: input.v, source, updatedAt: source.checkedAt, ...(n ? { note: n } : {}) };
  }
  return { value: input, source: fallback, updatedAt: fallback.checkedAt, ...(note ? { note } : {}) };
}

function unknown<T>(note = UNKNOWN_NOTE): Fact<T> {
  return { value: null, source: null, updatedAt: CHECKED, note };
}

export function buildProvider(input: ProviderInput): Provider {
  return {
    id: input.id,
    slug: input.id,
    name: input.name,
    kind: input.kind,
    description: input.description,
    website: input.website,
    country: input.country ?? null,
    founded: input.founded ?? null,
    color: input.color,
    logo: input.logo ?? "",
    products: input.products,
    sources: input.sources,
    updatedAt: CHECKED,
  };
}

function benchmarkId(modelId: string, input: BenchmarkInput, index: number) {
  return `${modelId}-${input.benchmark}-${index + 1}`.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

export function buildModel(input: ModelInput, rank: number): AIModel {
  const fallback = input.source;
  const capabilities = Object.fromEntries(
    CAPABILITIES.map((key) => [
      key,
      input.caps?.[key] === undefined
        ? unknown<boolean>("Not established in the checked sources; unknown is not the same as unsupported.")
        : toFact(input.caps[key], fallback),
    ]),
  ) as AIModel["capabilities"];

  const releases: ModelRelease[] = (input.events ?? []).map((event, index) => ({
    id: `${input.id}-${event.type}-${index + 1}`,
    ...event,
  }));

  const releaseFact = toFact(input.released, fallback);
  if (releaseFact.value && !releases.some((event) => event.type === "release")) {
    releases.unshift({
      id: `${input.id}-release`,
      date: releaseFact.value,
      title: `${input.name} released`,
      description: releaseFact.note ?? `${input.name} became available.`,
      type: "release",
      source: releaseFact.source ?? fallback,
    });
  }

  const benchmarks: BenchmarkResult[] = (input.benchmarks ?? []).map((entry, index) => ({
    id: benchmarkId(input.id, entry, index),
    benchmarkId: entry.benchmark,
    score: entry.score,
    ...(entry.display ? { display: entry.display } : {}),
    version: entry.version ?? null,
    evaluatedAt: entry.date,
    conditions: entry.conditions ?? null,
    reportedBy: entry.reportedBy,
    source: entry.source,
  }));

  const priceNote = input.price?.note;

  return {
    id: input.id,
    slug: input.id,
    name: input.name,
    providerId: input.provider,
    family: input.family,
    description: input.description,
    version: input.version,
    categories: input.categories,
    status: input.status,
    releaseDate: releaseFact,
    knowledgeCutoff: toFact(input.cutoff, fallback),
    contextWindow: toFact(input.context, fallback),
    maxOutput: toFact(input.maxOutput, fallback),
    openness: toFact(input.openness, fallback),
    license: toFact(input.license, fallback),
    apiAvailable: toFact(input.api, fallback),
    freeAccess: toFact(input.free, fallback),
    languages: toFact(input.languages, fallback),
    speed: unknown("No standardized, independently measured latency data is recorded. Marketing speed claims are not measurements."),
    capabilities,
    pricing: {
      input: toFact(input.price?.input, fallback, priceNote),
      cachedInput: toFact(input.price?.cachedInput, fallback, priceNote),
      output: toFact(input.price?.output, fallback, priceNote),
      other: toFact(input.price?.other, fallback),
      subscription: unknown("Subscriptions belong to provider products, not individual API model versions."),
      currency: "USD",
      unit: "1M tokens",
    },
    website: input.website ?? fallback.url,
    apiDocs: input.apiDocs === undefined ? fallback.url : input.apiDocs,
    bestFor: input.bestFor ?? [],
    tags: input.tags ?? [],
    benchmarks,
    releases: releases.sort((a, b) => b.date.localeCompare(a.date)),
    editorial: {
      rank,
      trending: Boolean(input.trending),
      rationale: input.trending?.reason ?? "Listed for catalog completeness. No popularity or quality ranking is implied.",
      trendSource: input.trending?.source ?? null,
      updatedAt: CHECKED,
    },
    addedAt: CHECKED,
    updatedAt: CHECKED,
  };
}
