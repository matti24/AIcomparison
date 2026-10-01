
import { src, type ProviderFile } from "../define";

type Model = ProviderFile["models"][number];
type Categories = Model["categories"];
type UseCases = NonNullable<Model["bestFor"]>;

const S = {
  anthropicOverview: src("Anthropic · Claude models overview", "https://platform.claude.com/docs/en/models/overview.md"),
  anthropicPricing: src("Anthropic · Claude API pricing", "https://platform.claude.com/docs/en/about-claude/pricing.md"),
  anthropicDeprecations: src("Anthropic · Claude model deprecations", "https://platform.claude.com/docs/en/about-claude/model-deprecations.md"),
  fable51: src("Anthropic · Claude Fable 5.1 overview", "https://platform.claude.com/docs/en/models/fable-5-1/overview.md"),
  fable51Launch: src("Anthropic · Introducing Claude Fable 5.1", "https://www.anthropic.com/claude-fable-and-mythos-5-1"),
  fable5: src("Anthropic · Claude Fable 5 overview", "https://platform.claude.com/docs/en/models/fable-5/overview.md"),
  opus55: src("Anthropic · Claude Opus 5.5 overview", "https://platform.claude.com/docs/en/models/opus-5-5/overview.md"),
  opus55Launch: src("Anthropic · Introducing Claude Opus 5.5", "https://www.anthropic.com/claude-opus-5-5"),
  opus5: src("Anthropic · Claude Opus 5 overview", "https://platform.claude.com/docs/en/models/opus-5/overview.md"),
  opus48: src("Anthropic · Claude Opus 4.8 overview", "https://platform.claude.com/docs/en/models/opus-4-8/overview.md"),
  opus47: src("Anthropic · Claude Opus 4.7 overview", "https://platform.claude.com/docs/en/models/opus-4-7/overview.md"),
  opus46: src("Anthropic · Claude Opus 4.6 overview", "https://platform.claude.com/docs/en/models/opus-4-6/overview.md"),
  opus45: src("Anthropic · Claude Opus 4.5 overview", "https://platform.claude.com/docs/en/models/opus-4-5/overview.md"),
  sonnet55: src("Anthropic · Claude Sonnet 5.5 overview", "https://platform.claude.com/docs/en/models/sonnet-5-5/overview.md"),
  sonnet55Launch: src("Anthropic · Introducing Claude Sonnet 5.5", "https://www.anthropic.com/claude-sonnet-5-5"),
  sonnet5: src("Anthropic · Claude Sonnet 5 overview", "https://platform.claude.com/docs/en/models/sonnet-5/overview.md"),
  sonnet46: src("Anthropic · Claude Sonnet 4.6 overview", "https://platform.claude.com/docs/en/models/sonnet-4-6/overview.md"),
  sonnet45: src("Anthropic · Claude Sonnet 4.5 overview", "https://platform.claude.com/docs/en/models/sonnet-4-5/overview.md"),
  haiku45: src("Anthropic · Claude Haiku 4.5 overview", "https://platform.claude.com/docs/en/models/haiku-4-5/overview.md"),
  xaiModels: src("xAI · Models and pricing", "https://docs.x.ai/developers/models"),
  grok47Launch: src("xAI · Grok 4.7 launch", "https://x.ai/news/grok-4-7"),
  grok47: src("xAI · Grok 4.7 model reference", "https://docs.x.ai/developers/models/grok-4.7"),
  grok46Launch: src("xAI · Grok 4.6 launch", "https://x.ai/news/grok-4-6"),
  grok46: src("xAI · Grok 4.6 model reference", "https://docs.x.ai/developers/models/grok-4.6"),
  grok45Launch: src("xAI · Grok 4.5 launch", "https://x.ai/news/grok-4-5"),
  grok45: src("xAI · Grok 4.5 model reference", "https://docs.x.ai/developers/models/grok-4.5"),
  grok43: src("xAI · Grok 4.3 model reference", "https://docs.x.ai/developers/models/grok-4.3"),
  grok420: src("xAI · Grok 4.20 reasoning model reference", "https://docs.x.ai/developers/models/grok-4.20-0309-reasoning"),
  grokBuild: src("xAI · Grok Build 0.1 model reference", "https://docs.x.ai/developers/models/grok-build-0.1"),
  grokImage2: src("xAI · Grok Imagine Image 2.0 model reference", "https://docs.x.ai/developers/models/grok-imagine-image-2.0"),
  grokVideo15: src("xAI · Grok Imagine Video 1.5 model reference", "https://docs.x.ai/developers/models/grok-imagine-video-1.5"),
  xaiVoice: src("xAI · Voice API overview", "https://docs.x.ai/developers/model-capabilities/audio/voice"),
  grok1: src("xAI · Grok-1 official Hugging Face README", "https://huggingface.co/xai-org/grok-1/raw/main/README.md"),
  grok2: src("xAI · Grok 2 official Hugging Face README", "https://huggingface.co/xai-org/grok-2/raw/main/README.md"),
};

const hosted = "Hosted API model; no downloadable-weight release is specified in the cited source.";
const claudePriceNote = "Claude API base text-token rate. Batch, prompt-cache writes, partner clouds, data residency, and long-context beta behavior can differ.";
const xaiLongContextNote = "Base rate for prompts below 200k tokens. Requests at or above 200k prompt tokens are billed at the higher long-context rate in xAI's pricing table.";
const weightsNote = "Downloadable weights; no first-party hosted API price is inferred from the model card.";

export const providers: ProviderFile["providers"] = [
  {
    id: "anthropic",
    name: "Anthropic",
    kind: "lab",
    description: "Develops the Claude model family for writing, analysis, coding, and tool-using applications. Claude the app and the Claude API are separate access products.",
    website: "https://www.anthropic.com",
    color: "#D97757",
    logo: "/logos/anthropic.svg",
    products: [
      { name: "Claude", description: "Assistant application; plan access is separate from API token billing.", url: "https://claude.ai" },
      { name: "Claude API", description: "Programmatic Messages API and developer tooling for Claude models.", url: "https://platform.claude.com/docs" },
    ],
    sources: [S.anthropicOverview, S.anthropicPricing, S.anthropicDeprecations],
  },
  {
    id: "xai",
    name: "xAI",
    kind: "lab",
    description: "Develops Grok language, coding, image, video, and voice models. The Grok consumer product and the xAI API are separate access paths.",
    website: "https://x.ai",
    color: "#18181B",
    logo: "/logos/xai.svg",
    products: [
      { name: "Grok", description: "Assistant application with optional realtime search features.", url: "https://grok.com" },
      { name: "xAI API", description: "Developer APIs for Grok text, image, video, and voice models.", url: "https://docs.x.ai" },
    ],
    sources: [S.xaiModels, S.grok47, S.xaiVoice, S.grok1, S.grok2],
  },
];

function deprecation(date: string, title: string, description: string) {
  return { date, type: "deprecation" as const, title, description, source: S.anthropicDeprecations };
}

function retirement(date: string, title: string, description: string) {
  return { date, type: "retirement" as const, title, description, source: S.anthropicDeprecations };
}

function claude(input: {
  id: string;
  name: string;
  family: string;
  version: string;
  categories: Categories;
  status?: Model["status"];
  description: string;
  source: Model["source"];
  released?: string;
  cutoff?: string;
  context?: number;
  maxOutput?: number;
  price?: [number, number, number];
  bestFor: UseCases;
  tags: string[];
  trending?: { reason: string; source: Model["source"] };
  events?: Model["events"];
  api?: Model["api"];
}): Model {
  const caps: Model["caps"] = { text: true, imageInput: true, imageOutput: false, reasoning: true, coding: true, toolCalling: true, multilingual: true };
  if (input.context === 1_000_000 && input.status !== "deprecated") caps.batchApi = true;
  return {
    id: input.id,
    name: input.name,
    provider: "anthropic",
    family: input.family,
    version: input.version,
    categories: input.categories,
    status: input.status ?? "active",
    description: input.description,
    source: input.source,
    released: input.released,
    cutoff: input.cutoff,
    context: input.context,
    maxOutput: input.maxOutput,
    openness: { v: "proprietary", n: hosted },
    api: input.api ?? true,
    price: input.price ? { input: { v: input.price[0], s: S.anthropicPricing }, cachedInput: { v: input.price[1], s: S.anthropicPricing }, output: { v: input.price[2], s: S.anthropicPricing }, note: claudePriceNote } : undefined,
    caps,
    bestFor: input.bestFor,
    tags: input.tags,
    trending: input.trending,
    events: input.events,
  };
}

function retiredClaude(input: {
  id: string;
  name: string;
  family: string;
  version: string;
  categories: Categories;
  description: string;
  deprecated: string;
  retired: string;
  replacement: string;
  price?: [number, number, number];
  tags: string[];
}): Model {
  return {
    id: input.id,
    name: input.name,
    provider: "anthropic",
    family: input.family,
    version: input.version,
    categories: input.categories,
    status: "retired",
    description: input.description,
    source: S.anthropicDeprecations,
    openness: { v: "proprietary", s: S.anthropicDeprecations, n: hosted },
    api: { v: false, s: S.anthropicDeprecations, n: `Retired on ${input.retired}; Anthropic says requests to retired models fail.` },
    price: input.price ? { input: { v: input.price[0], s: S.anthropicPricing }, cachedInput: { v: input.price[1], s: S.anthropicPricing }, output: { v: input.price[2], s: S.anthropicPricing }, note: claudePriceNote } : undefined,
    caps: { text: true },
    bestFor: ["general"],
    tags: input.tags,
    events: [
      deprecation(input.deprecated, `${input.name} deprecated`, `Anthropic recommended migrating to ${input.replacement}.`),
      retirement(input.retired, `${input.name} retired`, "Anthropic-operated platforms no longer serve this model."),
    ],
  };
}

function xaiText(input: {
  id: string;
  name: string;
  family: string;
  version: string;
  source: Model["source"];
  description: string;
  context: number;
  price: [number, number, number];
  batch?: boolean;
  bestFor: UseCases;
  tags: string[];
  cutoff?: Model["cutoff"];
}): Model {
  return {
    id: input.id,
    name: input.name,
    provider: "xai",
    family: input.family,
    version: input.version,
    categories: ["reasoning", "coding"],
    status: "active",
    description: input.description,
    source: input.source,
    cutoff: input.cutoff,
    context: input.context,
    openness: { v: "proprietary", n: hosted },
    api: true,
    price: { input: input.price[0], cachedInput: input.price[1], output: input.price[2], note: xaiLongContextNote },
    caps: { text: true, imageInput: true, imageOutput: false, reasoning: true, coding: true, toolCalling: true, structuredOutputs: true, batchApi: input.batch },
    bestFor: input.bestFor,
    tags: input.tags,
  };
}

const deprecatedSonnet45Events = [
  deprecation("2026-09-30", "Claude Sonnet 4.5 deprecated", "Anthropic recommends migrating to claude-sonnet-5-5."),
  retirement("2026-11-30", "Claude Sonnet 4.5 retirement scheduled", "Anthropic lists November 30, 2026 as the tentative retirement date."),
];

const anthropicModels: Model[] = [
  { ...claude({ id: "claude-fable-5-1", name: "Claude Fable 5.1", family: "Claude 5", version: "claude-fable-5-1", categories: ["reasoning", "agentic", "coding"], source: S.fable51, released: "2026-09-01", cutoff: "2026-06", context: 1_000_000, maxOutput: 128_000, price: [10, 0.25, 50], bestFor: ["research", "coding", "agents", "long-context"], tags: ["Claude 5", "Fable 5.1", "Adaptive thinking"], description: "Claude Fable 5.1 is Anthropic's current Fable model for demanding reasoning and long-horizon agentic work. Its page says it extends Claude Fable 5 at the same input and output prices with lower cache-read pricing.", trending: { reason: "Released September 1, 2026 in Anthropic's announcement.", source: S.fable51Launch } }), benchmarks: [{ benchmark: "terminal-bench", score: 55.8, display: "55.8%", version: "Terminal-Bench 4.0", date: "2026-09-01", conditions: "Provider comparison table; production safeguards enabled", reportedBy: "provider", source: S.fable51Launch }, { benchmark: "hle", score: 65.0, display: "65.0%", version: "Humanity's Last Exam", date: "2026-09-01", conditions: "With tools; production safeguards enabled", reportedBy: "provider", source: S.fable51Launch }, { benchmark: "osworld", score: 77.9, display: "77.9% partial", version: "OSWorld 2.0", date: "2026-09-01", conditions: "Partial credit; production safeguards enabled", reportedBy: "provider", source: S.fable51Launch }] },
  { ...claude({ id: "claude-opus-5-5", name: "Claude Opus 5.5", family: "Claude 5.5", version: "claude-opus-5-5", categories: ["reasoning", "coding", "agentic"], source: S.opus55, released: "2026-09-22", cutoff: "2026-06", context: 1_000_000, maxOutput: 128_000, price: [4, 0.2, 20], bestFor: ["coding", "research", "agents", "long-context"], tags: ["Claude 5.5", "Opus", "Adaptive thinking"], description: "Claude Opus 5.5 is built for long-running agentic coding and knowledge work. Its overview documents adaptive thinking as always on and notes breaking changes for forced tool use and prior computer-use tooling.", trending: { reason: "Released September 22, 2026 in Anthropic's announcement.", source: S.opus55Launch } }), benchmarks: [{ benchmark: "terminal-bench", score: 66.4, display: "66.4%", version: "Terminal-Bench 4.0", date: "2026-09-22", conditions: "xhigh effort; production safeguards enabled", reportedBy: "provider", source: S.opus55Launch }, { benchmark: "hle", score: 67.7, display: "67.7%", version: "Humanity's Last Exam", date: "2026-09-22", conditions: "With tools; max effort unless otherwise noted", reportedBy: "provider", source: S.opus55Launch }, { benchmark: "osworld", score: 81.8, display: "81.8% partial", version: "OSWorld 2.1", date: "2026-09-22", conditions: "Partial credit; max effort unless otherwise noted", reportedBy: "provider", source: S.opus55Launch }] },
  { ...claude({ id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", family: "Claude 5.5", version: "claude-sonnet-5-5", categories: ["coding", "reasoning", "agentic"], source: S.sonnet55, released: "2026-09-28", cutoff: "2026-06", context: 1_000_000, maxOutput: 128_000, price: [2, 0.2, 10], bestFor: ["coding", "writing", "business", "agents"], tags: ["Claude 5.5", "Sonnet", "Adaptive thinking"], description: "Claude Sonnet 5.5 is a current Sonnet model for coding, writing, and tool-using workflows. Its overview documents a 1M-token context window, adaptive thinking, and tool-use migration changes from Sonnet 5.", trending: { reason: "Released September 28, 2026 in Anthropic's announcement.", source: S.sonnet55Launch } }), benchmarks: [{ benchmark: "terminal-bench", score: 70.6, display: "70.6%", version: "Terminal-Bench 4.0", date: "2026-09-28", conditions: "Provider-reported agentic coding evaluation", reportedBy: "provider", source: S.sonnet55Launch }, { benchmark: "hle", score: 64.5, display: "64.5%", version: "Humanity's Last Exam", date: "2026-09-28", conditions: "With tools", reportedBy: "provider", source: S.sonnet55Launch }, { benchmark: "osworld", score: 80.1, display: "80.1% partial", version: "OSWorld 2.1", date: "2026-09-28", conditions: "Partial credit", reportedBy: "provider", source: S.sonnet55Launch }] },
  claude({ id: "claude-haiku-4-5", name: "Claude Haiku 4.5", family: "Claude 4", version: "claude-haiku-4-5-20251001", categories: ["general", "vision", "coding"], source: S.haiku45, released: "2025-10-15", cutoff: "2025-02", context: 200_000, maxOutput: 64_000, price: [1, 0.1, 5], bestFor: ["high-volume", "customer-support", "writing", "general"], tags: ["Claude 4.5", "Haiku", "Extended thinking"], description: "Claude Haiku 4.5 is Anthropic's fast Claude model in the current lineup. Its overview lists text and image input, text output, extended thinking, and a 200K-token context window." }),
  claude({ id: "claude-fable-5", name: "Claude Fable 5", family: "Claude 5", version: "claude-fable-5", categories: ["reasoning", "agentic", "coding"], source: S.fable5, released: "2026-06-09", cutoff: "2026-01", context: 1_000_000, maxOutput: 128_000, price: [10, 1, 50], bestFor: ["research", "coding", "agents", "long-context"], tags: ["Claude 5", "Fable", "Legacy"], description: "Claude Fable 5 is a legacy but still available Fable model. Anthropic recommends considering migration to Claude Fable 5.1 for improved performance." }),
  { ...claude({ id: "claude-opus-5", name: "Claude Opus 5", family: "Claude 5", version: "claude-opus-5", categories: ["reasoning", "coding", "agentic"], source: S.opus5, released: "2026-07-24", cutoff: "2026-05", context: 1_000_000, maxOutput: 128_000, price: [5, 0.5, 25], bestFor: ["coding", "research", "agents", "long-context"], tags: ["Claude 5", "Opus", "Legacy"], description: "Claude Opus 5 is a legacy but still available Opus model. Its overview lists adaptive thinking, a 1M-token context window, and migration guidance toward Opus 5.5." }), benchmarks: [{ benchmark: "terminal-bench", score: 52.3, display: "52.3%", version: "Terminal-Bench 4.0", date: "2026-09-22", conditions: "Provider comparison table; public leaderboard reproduced within noise", reportedBy: "provider", source: S.opus55Launch }, { benchmark: "hle", score: 63.6, display: "63.6%", version: "Humanity's Last Exam", date: "2026-09-22", conditions: "With tools", reportedBy: "provider", source: S.opus55Launch }, { benchmark: "osworld", score: 74.0, display: "74.0% partial", version: "OSWorld 2.1", date: "2026-09-22", conditions: "Partial credit", reportedBy: "provider", source: S.opus55Launch }] },
  claude({ id: "claude-sonnet-5", name: "Claude Sonnet 5", family: "Claude 5", version: "claude-sonnet-5", categories: ["coding", "reasoning", "agentic"], source: S.sonnet5, released: "2026-06-30", cutoff: "2026-01", context: 1_000_000, maxOutput: 128_000, price: [2, 0.2, 10], bestFor: ["coding", "writing", "business", "agents"], tags: ["Claude 5", "Sonnet", "Legacy"], description: "Claude Sonnet 5 is a legacy but still available Sonnet model. The pricing page says its launch introductory $2 / $10 per-million-token rate is now standard pricing." }),
  claude({ id: "claude-opus-4-8", name: "Claude Opus 4.8", family: "Claude 4", version: "claude-opus-4-8", categories: ["reasoning", "coding", "agentic"], source: S.opus48, released: "2026-05-28", cutoff: "2026-01", context: 1_000_000, maxOutput: 128_000, price: [5, 0.5, 25], bestFor: ["research", "coding", "agents", "long-context"], tags: ["Claude 4.8", "Opus", "Legacy"], description: "Claude Opus 4.8 is a legacy but still available Opus model. Its page documents the newer tokenizer, a 1M-token context window, and 128K synchronous max output." }),
  claude({ id: "claude-opus-4-7", name: "Claude Opus 4.7", family: "Claude 4", version: "claude-opus-4-7", categories: ["reasoning", "coding", "agentic"], source: S.opus47, released: "2026-04-16", cutoff: "2026-01", context: 1_000_000, maxOutput: 128_000, price: [5, 0.5, 25], bestFor: ["research", "coding", "agents", "long-context"], tags: ["Claude 4.7", "Opus", "Legacy"], description: "Claude Opus 4.7 is a legacy but still available Opus model. Anthropic documents it as using the current tokenizer with a 1M-token context window." }),
  claude({ id: "claude-opus-4-6", name: "Claude Opus 4.6", family: "Claude 4", version: "claude-opus-4-6", categories: ["reasoning", "coding", "agentic"], source: S.opus46, released: "2026-02-05", cutoff: "2025-05", context: 1_000_000, maxOutput: 128_000, price: [5, 0.5, 25], bestFor: ["research", "coding", "agents", "long-context"], tags: ["Claude 4.6", "Opus", "Legacy"], description: "Claude Opus 4.6 is a legacy but still available Opus model. The overview lists a 1M-token context window and notes extended thinking is deprecated for this generation." }),
  claude({ id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", family: "Claude 4", version: "claude-sonnet-4-6", categories: ["coding", "reasoning", "agentic"], source: S.sonnet46, released: "2026-02-17", cutoff: "2025-08", context: 1_000_000, maxOutput: 128_000, price: [3, 0.3, 15], bestFor: ["coding", "writing", "business", "agents"], tags: ["Claude 4.6", "Sonnet", "Legacy"], description: "Claude Sonnet 4.6 is a legacy but still available Sonnet model. Its overview documents a 1M-token context window, 128K max output, and deprecation of extended thinking for this generation." }),
  claude({ id: "claude-opus-4-5", name: "Claude Opus 4.5", family: "Claude 4", version: "claude-opus-4-5-20251101", categories: ["reasoning", "coding"], source: S.opus45, released: "2025-11-24", cutoff: "2025-05", context: 200_000, maxOutput: 64_000, price: [5, 0.5, 25], bestFor: ["research", "coding", "agents"], tags: ["Claude 4.5", "Opus", "Legacy"], description: "Claude Opus 4.5 is a legacy Opus model that remains active on Anthropic-operated platforms. Its overview lists a 200K-token context window and 64K-token max output." }),
  claude({ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", family: "Claude 4", version: "claude-sonnet-4-5-20250929", categories: ["coding", "reasoning"], status: "deprecated", source: S.sonnet45, released: "2025-09-29", cutoff: "2025-01", context: 200_000, maxOutput: 64_000, price: [3, 0.3, 15], bestFor: ["coding", "writing", "business"], tags: ["Claude 4.5", "Sonnet", "Deprecated"], description: "Claude Sonnet 4.5 is deprecated on Anthropic-operated platforms with a November 30, 2026 retirement date. Anthropic recommends Claude Sonnet 5.5 as the replacement.", api: { v: true, s: S.anthropicDeprecations, n: "Deprecated but still functional until the scheduled retirement date." }, events: deprecatedSonnet45Events }),
  retiredClaude({ id: "claude-opus-4-1", name: "Claude Opus 4.1", family: "Claude 4", version: "claude-opus-4-1-20250805", categories: ["reasoning", "coding"], description: "Claude Opus 4.1 is retired on Anthropic-operated platforms. Anthropic's deprecation page lists Claude Opus 4.8 as its recommended replacement.", deprecated: "2026-06-05", retired: "2026-08-05", replacement: "claude-opus-4-8", price: [15, 1.5, 75], tags: ["Claude 4.1", "Opus", "Retired"] }),
  retiredClaude({ id: "claude-opus-4", name: "Claude Opus 4", family: "Claude 4", version: "claude-opus-4-20250514", categories: ["reasoning", "coding"], description: "Claude Opus 4 is retired on Anthropic-operated platforms. The deprecation page lists Claude Opus 4.8 as the recommended replacement.", deprecated: "2026-04-14", retired: "2026-06-15", replacement: "claude-opus-4-8", price: [15, 1.5, 75], tags: ["Claude 4", "Opus", "Retired"] }),
  retiredClaude({ id: "claude-sonnet-4", name: "Claude Sonnet 4", family: "Claude 4", version: "claude-sonnet-4-20250514", categories: ["coding", "reasoning"], description: "Claude Sonnet 4 is retired on Anthropic-operated platforms. The deprecation page lists Claude Sonnet 4.6 as the recommended replacement.", deprecated: "2026-04-14", retired: "2026-06-15", replacement: "claude-sonnet-4-6", price: [3, 0.3, 15], tags: ["Claude 4", "Sonnet", "Retired"] }),
  retiredClaude({ id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet", family: "Claude 3", version: "claude-3-7-sonnet-20250219", categories: ["reasoning", "coding"], description: "Claude 3.7 Sonnet is retired on Anthropic-operated platforms. Anthropic recommended Claude Sonnet 4.6 for migration.", deprecated: "2025-10-28", retired: "2026-02-19", replacement: "claude-sonnet-4-6", tags: ["Claude 3.7", "Sonnet", "Retired"] }),
  retiredClaude({ id: "claude-3-5-haiku", name: "Claude 3.5 Haiku", family: "Claude 3", version: "claude-3-5-haiku-20241022", categories: ["general"], description: "Claude 3.5 Haiku is retired on Anthropic-operated platforms. Anthropic recommended Claude Haiku 4.5 as the replacement.", deprecated: "2025-12-19", retired: "2026-02-19", replacement: "claude-haiku-4-5-20251001", price: [0.8, 0.08, 4], tags: ["Claude 3.5", "Haiku", "Retired"] }),
  retiredClaude({ id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", family: "Claude 3", version: "claude-3-5-sonnet-20241022", categories: ["coding", "general"], description: "Claude 3.5 Sonnet is retired on Anthropic-operated platforms. Anthropic's deprecation history lists both 20240620 and 20241022 Sonnet 3.5 snapshots as retired.", deprecated: "2025-08-13", retired: "2025-10-28", replacement: "claude-sonnet-4-6", tags: ["Claude 3.5", "Sonnet", "Retired"] }),
  retiredClaude({ id: "claude-3-opus", name: "Claude 3 Opus", family: "Claude 3", version: "claude-3-opus-20240229", categories: ["reasoning", "general"], description: "Claude 3 Opus is retired on Anthropic-operated platforms. Anthropic's deprecation page recommended Claude Opus 4.8 as its replacement.", deprecated: "2025-06-30", retired: "2026-01-05", replacement: "claude-opus-4-8", tags: ["Claude 3", "Opus", "Retired"] }),
  retiredClaude({ id: "claude-3-sonnet", name: "Claude 3 Sonnet", family: "Claude 3", version: "claude-3-sonnet-20240229", categories: ["general", "coding"], description: "Claude 3 Sonnet is retired on Anthropic-operated platforms. Anthropic's deprecation page recommended Claude Sonnet 4.6 as its replacement.", deprecated: "2025-01-21", retired: "2025-07-21", replacement: "claude-sonnet-4-6", tags: ["Claude 3", "Sonnet", "Retired"] }),
  retiredClaude({ id: "claude-3-haiku", name: "Claude 3 Haiku", family: "Claude 3", version: "claude-3-haiku-20240307", categories: ["general"], description: "Claude 3 Haiku is retired on Anthropic-operated platforms. Anthropic recommended Claude Haiku 4.5 as the replacement.", deprecated: "2026-02-19", retired: "2026-04-20", replacement: "claude-haiku-4-5-20251001", tags: ["Claude 3", "Haiku", "Retired"] }),
];

const xaiModels: Model[] = [
  {
    ...xaiText({ id: "grok-4-7", name: "Grok 4.7", family: "Grok 4", version: "grok-4.7", source: S.grok47, context: 500_000, price: [2, 0.5, 6], bestFor: ["coding", "research", "business", "agents"], tags: ["Grok 4.7", "Reasoning", "Vision"], cutoff: { v: "2026-05", s: S.xaiModels, n: "xAI publishes the Grok 4.7 knowledge cut-off month on the models page." }, description: "Grok 4.7 is xAI's frontier text-and-image to text model for coding, agentic tasks, and knowledge work. xAI documents function calling, structured outputs, reasoning efforts, and a 500K-token context window." }),
    caps: { text: true, imageInput: true, imageOutput: false, reasoning: true, coding: true, toolCalling: true, structuredOutputs: true, webSearch: { v: true, s: S.xaiModels, n: "Realtime information requires enabling Web Search or X Search tools." } },
    benchmarks: [{ benchmark: "terminal-bench", score: 37.6, display: "37.6%", version: "Terminal-Bench 4.0", date: "2026-09-21", conditions: "xHigh effort", reportedBy: "provider", source: S.grok47Launch }],
  },
  { ...xaiText({ id: "grok-4-6", name: "Grok 4.6", family: "Grok 4", version: "grok-4.6", source: S.grok46, context: 500_000, price: [2, 0.5, 6], bestFor: ["coding", "research", "agents"], tags: ["Grok 4.6", "Reasoning", "Vision"], description: "Grok 4.6 is a text-and-image to text Grok model. The xAI model page lists a 500K-token context window, reasoning efforts, function calling, and structured outputs." }), benchmarks: [{ benchmark: "terminal-bench", score: 20.3, display: "20.3%", version: "Terminal-Bench 4.0", date: "2026-09-21", conditions: "High effort", reportedBy: "provider", source: S.grok47Launch }] },
  { ...xaiText({ id: "grok-4-5", name: "Grok 4.5", family: "Grok 4", version: "grok-4.5", source: S.grok45, context: 500_000, price: [2, 0.3, 6], bestFor: ["coding", "research", "agents"], tags: ["Grok 4.5", "Reasoning", "Vision"], description: "Grok 4.5 is a text-and-image to text Grok model. xAI lists reasoning, function calling, structured outputs, and a 500K-token context window." }), benchmarks: [{ benchmark: "terminal-bench", score: 83.3, display: "83.3%", version: "Terminal-Bench 2.1", date: "2026-07-16", conditions: "Provider benchmark chart", reportedBy: "provider", source: S.grok45Launch }, { benchmark: "swe-bench-pro", score: 64.7, display: "64.7%", version: "SWE Bench Pro", date: "2026-07-16", conditions: "Resolve rate", reportedBy: "provider", source: S.grok45Launch }] },
  xaiText({ id: "grok-4-3", name: "Grok 4.3", family: "Grok 4", version: "grok-4.3", source: S.grok43, context: 1_000_000, price: [1.25, 0.2, 2.5], batch: true, bestFor: ["coding", "research", "long-context", "agents"], tags: ["Grok 4.3", "1M context", "Batch API"], description: "Grok 4.3 is a text-and-image to text Grok model. The xAI model page lists a 1M-token context window, reasoning efforts, function calling, structured outputs, and Batch API support." }),
  xaiText({ id: "grok-4-20-0309-reasoning", name: "Grok 4.20 0309 Reasoning", family: "Grok 4", version: "grok-4.20-0309-reasoning", source: S.grok420, context: 1_000_000, price: [1.25, 0.2, 2.5], batch: true, bestFor: ["research", "agents", "long-context"], tags: ["Grok 4.20", "Reasoning", "Batch API"], description: "Grok 4.20 0309 Reasoning is a text-and-image to text Grok model. xAI lists reasoning, function calling, structured outputs, a 1M-token context window, and Batch API support." }),
  { ...xaiText({ id: "grok-build-0-1", name: "Grok Build 0.1", family: "Grok Code", version: "grok-build-0.1", source: S.grokBuild, context: 256_000, price: [1, 0.2, 2], bestFor: ["coding", "agents"], tags: ["Grok Build", "Grok Code Fast", "Agentic coding"], description: "Grok Build 0.1 is xAI's coding model for agentic software, engineering, and workflow tasks. The model page lists aliases including grok-code-fast-1 and grok-code-fast." }), categories: ["coding", "agentic"] },
  {
    id: "grok-imagine-image-2-0", name: "Grok Imagine Image 2.0", provider: "xai", family: "Grok Imagine", version: "grok-imagine-image-2.0", categories: ["image-generation", "image-editing"], status: "active",
    description: "Grok Imagine Image 2.0 is xAI's text-and-image to image model. xAI's model and pricing pages list it as the recommended image model and price it per generated image.", source: S.grokImage2,
    openness: { v: "proprietary", n: hosted }, api: true, price: { other: { v: "$0.04 / image", s: S.xaiModels } }, caps: { text: true, imageInput: true, imageOutput: true, imageEditing: true, batchApi: true }, bestFor: ["image-creation", "business"], tags: ["Grok Imagine", "Image 2.0", "Image generation"],
  },
  {
    id: "grok-imagine-image-quality", name: "Grok Imagine Image Quality", provider: "xai", family: "Grok Imagine", version: "grok-imagine-image-quality", categories: ["image-generation", "image-editing"], status: "active",
    description: "Grok Imagine Image Quality is an xAI image generation model listed on the official models page. xAI prices it separately from the default Grok Imagine Image model.", source: S.xaiModels,
    openness: { v: "proprietary", n: hosted }, api: true, price: { other: "$0.05 / image" }, caps: { text: true, imageInput: true, imageOutput: true, imageEditing: true }, bestFor: ["image-creation", "business"], tags: ["Grok Imagine", "Image quality", "Image generation"],
  },
  {
    id: "grok-imagine-video-1-5", name: "Grok Imagine Video 1.5", provider: "xai", family: "Grok Imagine", version: "grok-imagine-video-1.5", categories: ["video-generation"], status: "active",
    description: "Grok Imagine Video 1.5 is xAI's text-and-image to video model. Its page lists aliases including grok-imagine-video-1.5-preview and prices output per second.", source: S.grokVideo15,
    openness: { v: "proprietary", n: hosted }, api: true, price: { other: "$0.080 per second" }, caps: { text: true, imageInput: true, videoOutput: true, batchApi: true }, bestFor: ["video-creation", "business"], tags: ["Grok Imagine", "Video 1.5", "Video generation"],
  },
  {
    id: "grok-voice-think-fast-2-0", name: "Grok Voice Think Fast 2.0", provider: "xai", family: "Grok Voice", version: "grok-voice-think-fast-2.0", categories: ["realtime-voice"], status: "active",
    description: "Grok Voice Think Fast 2.0 powers xAI's realtime speech-to-speech Voice API. The voice overview describes low-latency turn-taking and tool use over WebSockets.", source: S.xaiVoice,
    openness: { v: "proprietary", n: hosted }, api: true, price: { other: "$0.08 / min ($4.80 / hr); $0.004 / text input" }, caps: { text: true, audioInput: true, audioOutput: true, realtime: true, toolCalling: true }, bestFor: ["voice", "customer-support", "agents"], tags: ["Grok Voice", "Realtime", "Speech to speech"],
  },
  {
    id: "grok-2-open-weights", name: "Grok 2 (open weights)", provider: "xai", family: "Grok 2", version: "xai-org/grok-2", categories: ["general"], status: "active",
    description: "xAI's official Hugging Face repository contains the weights of Grok 2, a model trained and used at xAI in 2024. The model card describes serving with SGLang and states the checkpoint is about 500 GB.", source: S.grok2,
    openness: "open-weights", license: { v: "Grok 2 Community License Agreement", s: S.grok2 }, api: { v: false, n: weightsNote }, free: { v: true, n: weightsNote }, caps: { text: true, selfHosting: true }, bestFor: ["research", "general"], tags: ["Grok 2", "Open weights", "Hugging Face"],
  },
  {
    id: "grok-1-open-weights", name: "Grok-1 (open weights)", provider: "xai", family: "Grok 1", version: "xai-org/grok-1", categories: ["general"], status: "active",
    description: "xAI's official Hugging Face repository contains the Grok-1 open-weights model. The README identifies a 314B-parameter checkpoint and links the official code repository.", source: S.grok1,
    openness: "open-weights", license: "Apache-2.0", api: { v: false, n: weightsNote }, free: { v: true, n: weightsNote }, caps: { text: true, selfHosting: true }, bestFor: ["research", "general"], tags: ["Grok-1", "314B", "Apache-2.0", "Open weights"],
  },
];

export const models: ProviderFile["models"] = [...anthropicModels, ...xaiModels];
