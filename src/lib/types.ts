export interface Source {
  label: string;
  url: string;
  /** Date the source was actually checked for this fact, not a launch date. */
  checkedAt: string;
}

export interface Fact<T> {
  value: T | null;
  source: Source | null;
  updatedAt: string;
  note?: string;
}

export const CAPABILITIES = [
  "text",
  "imageInput",
  "imageOutput",
  "imageEditing",
  "audioInput",
  "audioOutput",
  "videoInput",
  "videoOutput",
  "realtime",
  "webSearch",
  "toolCalling",
  "structuredOutputs",
  "reasoning",
  "coding",
  "computerUse",
  "multilingual",
  "fineTuning",
  "batchApi",
  "embeddings",
  "selfHosting",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const MODEL_CATEGORIES = [
  "general",
  "reasoning",
  "coding",
  "agentic",
  "search",
  "image-generation",
  "image-editing",
  "video-generation",
  "speech-to-text",
  "text-to-speech",
  "realtime-voice",
  "music-generation",
  "embeddings",
  "ocr",
  "computer-use",
  "robotics",
  "vision",
  "multimodal",
  "moderation",
] as const;

export type ModelCategory = (typeof MODEL_CATEGORIES)[number];

export const MODEL_STATUSES = ["active", "preview", "deprecated", "retired"] as const;
export type ModelStatus = (typeof MODEL_STATUSES)[number];

export type Openness = "proprietary" | "open-weights" | "open-source";
export type ProviderKind = "lab" | "platform";

export const USE_CASES = [
  "coding",
  "writing",
  "research",
  "school",
  "business",
  "data-analysis",
  "image-creation",
  "video-creation",
  "voice",
  "customer-support",
  "agents",
  "vision",
  "long-context",
  "high-volume",
  "general",
] as const;

export type UseCase = (typeof USE_CASES)[number];

export interface Provider {
  id: string;
  slug: string;
  name: string;
  kind: ProviderKind;
  description: string;
  website: string;
  country: string | null;
  founded: number | null;
  color: string;
  logo: string;
  products: { name: string; description: string; url: string }[];
  sources: Source[];
  updatedAt: string;
  updatedBy?: string;
}

export const BENCHMARK_CATEGORIES = [
  "knowledge",
  "reasoning",
  "math",
  "coding",
  "agentic",
  "multimodal",
  "long-context",
  "preference",
  "safety",
] as const;

export type BenchmarkCategory = (typeof BENCHMARK_CATEGORIES)[number];

export interface BenchmarkDefinition {
  id: string;
  name: string;
  description: string;
  category: BenchmarkCategory;
  unit: "%" | "elo" | "score";
  higherIsBetter: boolean;
  url: string;
}

export interface BenchmarkResult {
  id: string;
  benchmarkId: string;
  score: number;
  /** Optional verbatim display such as "74.9%" or "1,452 ± 5". */
  display?: string;
  version: string | null;
  evaluatedAt: string;
  conditions: string | null;
  reportedBy: "provider" | "independent";
  source: Source;
}

export const EVENT_TYPES = [
  "release",
  "update",
  "pricing",
  "api-feature",
  "context",
  "modality",
  "deprecation",
  "retirement",
] as const;

export type ModelEventType = (typeof EVENT_TYPES)[number];

export interface ModelRelease {
  id: string;
  date: string;
  title: string;
  description: string;
  type: ModelEventType;
  source: Source;
}

export interface AIModel {
  id: string;
  slug: string;
  name: string;
  providerId: string;
  family: string;
  description: string;
  version: string;
  /** First entry is the primary category. */
  categories: ModelCategory[];
  status: ModelStatus;
  releaseDate: Fact<string>;
  knowledgeCutoff: Fact<string>;
  contextWindow: Fact<number>;
  maxOutput: Fact<number>;
  openness: Fact<Openness>;
  license: Fact<string>;
  apiAvailable: Fact<boolean>;
  freeAccess: Fact<boolean>;
  languages: Fact<string>;
  speed: Fact<"fast" | "balanced" | "thorough">;
  capabilities: Record<Capability, Fact<boolean>>;
  pricing: {
    input: Fact<number>;
    cachedInput: Fact<number>;
    output: Fact<number>;
    /** Non-token pricing such as per image, per second, or per minute, verbatim. */
    other: Fact<string>;
    subscription: Fact<number>;
    currency: "USD";
    unit: "1M tokens";
  };
  website: string;
  apiDocs: string | null;
  bestFor: UseCase[];
  tags: string[];
  benchmarks: BenchmarkResult[];
  releases: ModelRelease[];
  editorial: {
    rank: number;
    trending: boolean;
    rationale: string;
    trendSource: Source | null;
    updatedAt: string;
  };
  addedAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface OutboundLink {
  id: string;
  targetType: "model" | "provider";
  targetId: string;
  label: string;
  destinationUrl: string;
  affiliateUrl: string | null;
  utmCampaign: string | null;
  isAffiliate: boolean;
  enabled: boolean;
  updatedAt: string;
}

export const SPONSOR_SLOTS = ["home", "models", "comparison", "provider", "newsletter"] as const;
export type SponsorSlot = (typeof SPONSOR_SLOTS)[number];

export interface SponsoredPlacement {
  id: string;
  slot: SponsorSlot;
  sponsor: string;
  title: string;
  description: string;
  url: string;
  providerId: string | null;
  modelId: string | null;
  enabled: boolean;
  startsAt: string;
  endsAt: string | null;
  updatedAt: string;
}

export interface ChangelogEntry {
  id: string;
  date: string;
  kind: "data" | "product";
  title: string;
  description: string;
}

export interface Catalog {
  schemaVersion: 2;
  providers: Provider[];
  models: AIModel[];
  benchmarks: BenchmarkDefinition[];
  links: OutboundLink[];
  sponsored: SponsoredPlacement[];
  changelog: ChangelogEntry[];
  updatedAt: string;
  updatedBy?: string;
}
