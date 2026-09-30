export interface Source {
  label: string;
  url: string;
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
  "audioInput",
  "audioOutput",
  "videoInput",
  "videoOutput",
  "webSearch",
  "toolCalling",
  "structuredOutputs",
  "reasoning",
  "coding",
  "multilingual",
  "fineTuning",
  "selfHosting",
] as const;

export type Capability = (typeof CAPABILITIES)[number];
export type ModelType =
  | "general"
  | "reasoning"
  | "coding"
  | "image"
  | "video"
  | "speech"
  | "embedding"
  | "research";
export type UseCase =
  | "coding"
  | "writing"
  | "research"
  | "school"
  | "business"
  | "data-analysis"
  | "image-creation"
  | "video-creation"
  | "customer-support"
  | "agents"
  | "general";

export interface Provider {
  id: string;
  slug: string;
  name: string;
  description: string;
  website: string;
  country: string | null;
  founded: number | null;
  color: string;
  logo: string;
  products: { name: string; description: string; url: string }[];
  sources: Source[];
  updatedAt: string;
}

export interface Benchmark {
  id: string;
  name: string;
  score: string;
  date: string;
  source: Source;
  note?: string;
}

export interface ModelRelease {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "release" | "pricing" | "capability" | "deprecation";
  source: Source;
}

export interface AIModel {
  id: string;
  slug: string;
  name: string;
  providerId: string;
  description: string;
  version: string;
  type: ModelType;
  status: "available" | "preview" | "deprecated";
  releaseDate: Fact<string>;
  knowledgeCutoff: Fact<string>;
  contextWindow: Fact<number>;
  maxOutput: Fact<number>;
  openness: Fact<"proprietary" | "open-weights" | "open-source">;
  apiAvailable: Fact<boolean>;
  freeAccess: Fact<boolean>;
  speed: Fact<"fast" | "balanced" | "thorough">;
  capabilities: Record<Capability, Fact<boolean>>;
  pricing: {
    input: Fact<number>;
    output: Fact<number>;
    subscription: Fact<number>;
    currency: "USD";
    unit: "1M tokens";
  };
  website: string;
  apiDocs: string | null;
  bestFor: UseCase[];
  tags: string[];
  benchmarks: Benchmark[];
  releases: ModelRelease[];
  editorial: {
    rank: number;
    trending: boolean;
    rationale: string;
    updatedAt: string;
  };
  addedAt: string;
  updatedAt: string;
}

export interface Catalog {
  providers: Provider[];
  models: AIModel[];
  updatedAt: string;
}
