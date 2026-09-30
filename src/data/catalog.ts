import {
  CAPABILITIES,
  type AIModel,
  type Capability,
  type Catalog,
  type Fact,
  type ModelRelease,
  type Provider,
  type Source,
} from "../lib/types";

// checkedAt records an actual source check, not a model launch or benchmark run.
const CHECKED = "2026-09-30";
const SNAPSHOT = "2026-09-30T11:28:18.881Z";

const source = (label: string, url: string): Source => ({ label, url, checkedAt: CHECKED });

const sources = {
  openaiSol: source("OpenAI · GPT-6.1 Sol API model reference", "https://developers.openai.com/api/docs/models/gpt-6.1-sol"),
  openaiMini: source("OpenAI · GPT-5.4 Mini API model reference", "https://developers.openai.com/api/docs/models/gpt-5.4-mini"),
  openaiImage: source("OpenAI · GPT Image 1.5 model reference and modality-specific pricing", "https://developers.openai.com/api/docs/models/gpt-image-1.5"),
  openaiSpeech: source("OpenAI · GPT-4o Mini TTS model reference", "https://developers.openai.com/api/docs/models/gpt-4o-mini-tts"),
  anthropicModels: source("Anthropic · Claude models overview", "https://platform.claude.com/docs/en/models/overview"),
  anthropicOpus: source("Anthropic · Claude Opus 5.5 specifications and release date", "https://platform.claude.com/docs/en/models/opus-5-5/overview"),
  anthropicSonnet: source("Anthropic · Claude Sonnet 5.5 specifications and release date", "https://platform.claude.com/docs/en/models/sonnet-5-5/overview"),
  geminiFlash: source("Google · Gemini 3.8 Flash developer guide and introductory pricing", "https://ai.google.dev/gemini-api/docs/latest-model"),
  geminiPro: source("Google · Gemini 3 series developer guide (3.1 Pro preview)", "https://ai.google.dev/gemini-api/docs/gemini-3"),
  geminiModels: source("Google · Gemini API model catalog", "https://ai.google.dev/gemini-api/docs/models"),
  veo: source("Google · Video generation model guide, including Veo 3.1", "https://ai.google.dev/gemini-api/docs/video"),
  grok: source("xAI · Grok 4.7 model reference", "https://docs.x.ai/developers/models/grok-4.7"),
  grokModels: source("xAI · Models, search caveats, and Grok 4.7 knowledge cutoff", "https://docs.x.ai/developers/models"),
  deepseek: source("DeepSeek · V3.2 official downloadable-weight model card", "https://huggingface.co/deepseek-ai/DeepSeek-V3.2/raw/main/README.md"),
  deepseekConfig: source("DeepSeek · V3.2 checkpoint configuration, not a hosted API limit", "https://huggingface.co/deepseek-ai/DeepSeek-V3.2/raw/main/config.json"),
  llama: source("Meta · Llama 4 official model card (April 2025 snapshot)", "https://raw.githubusercontent.com/meta-llama/llama-models/main/models/llama4/MODEL_CARD.md"),
  mistral: source("Mistral AI · Small 3.2 official model card (2506 snapshot)", "https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506/raw/main/README.md"),
  mistralConfig: source("Mistral AI · Small 3.2 checkpoint configuration", "https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506/raw/main/config.json"),
  mistralProducts: source("Mistral AI · Official product documentation index", "https://docs.mistral.ai/llms.txt"),
  qwen: source("Qwen · Qwen3-235B-A22B-Instruct-2507 model card and publisher evaluations", "https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507/raw/main/README.md"),
  qwenReleases: source("Qwen · Official Qwen3 release history", "https://raw.githubusercontent.com/QwenLM/Qwen3/main/README.md"),
  qwenCoder: source("Qwen · Qwen3-Coder-Next model card and deployment guide", "https://huggingface.co/Qwen/Qwen3-Coder-Next/raw/main/README.md"),
  qwenCode: source("Qwen · Qwen3-Coder repository and Qwen Code integration", "https://raw.githubusercontent.com/QwenLM/Qwen3-Coder/main/README.md"),
  phi: source("Microsoft · Phi-4-multimodal-instruct official model card", "https://huggingface.co/microsoft/Phi-4-multimodal-instruct/raw/main/README.md"),
  phiConfig: source("Microsoft · Phi-4-multimodal-instruct checkpoint configuration", "https://huggingface.co/microsoft/Phi-4-multimodal-instruct/raw/main/config.json"),
  sonarMigration: source("Perplexity · Sonar support ended September 27, 2026; Agent API migration", "https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar/overview.md"),
  sonarPricing: source("Perplexity · API pricing, including retained legacy Sonar rates", "https://docs.perplexity.ai/docs/getting-started/pricing.md"),
  cohereCommand: source("Cohere · Command A+ model card and May 20, 2026 release", "https://docs.cohere.com/docs/command-a-plus"),
  cohereModels: source("Cohere · Models, context windows, and output limits", "https://docs.cohere.com/docs/models"),
  cohereEmbed: source("Cohere · Embed v5.0 Pro and other embedding model specifications", "https://docs.cohere.com/docs/cohere-embed"),
  cohereEmbeddings: source("Cohere · Embed v5.0 Pro API example and embedding use cases", "https://docs.cohere.com/docs/embeddings"),
  coherePricing: source("Cohere · Model Vault deployment pricing", "https://cohere.com/pricing"),
  flux: source("Black Forest Labs · FLUX.2 model variants, fixed snapshots, and megapixel pricing", "https://docs.bfl.ai/flux_2/flux2_overview"),
  runway: source("Runway · API model catalog and professional output formats", "https://docs.dev.runwayml.com/guides/models/"),
  runwayGuide: source("Runway · Gen-4.5 image-to-video API example", "https://docs.dev.runwayml.com/guides/using-the-api/"),
  runwayPricing: source("Runway · API credit prices and per-second Gen-4.5 rates", "https://docs.dev.runwayml.com/guides/pricing/"),
};

function known<T>(value: T, provenance: Source, note?: string, updatedAt = CHECKED): Fact<T> {
  return { value, source: provenance, updatedAt, ...(note ? { note } : {}) };
}

function unknown<T>(note = "Not verified in the cited official sources.", provenance: Source | null = null): Fact<T> {
  return { value: null, source: provenance, updatedAt: CHECKED, note };
}

function capabilities(
  provenance: Source,
  values: Partial<Record<Capability, boolean>>,
  notes: Partial<Record<Capability, string>> = {},
  asOf = CHECKED,
): AIModel["capabilities"] {
  return Object.fromEntries(
    CAPABILITIES.map((key) => [
      key,
      values[key] === undefined
        ? unknown<boolean>(notes[key] ?? "Not established by this version's checked source; unknown is not no.")
        : known(values[key]!, provenance, notes[key], asOf),
    ]),
  ) as AIModel["capabilities"];
}

type ModelFacts = Pick<
  AIModel,
  "releaseDate" | "knowledgeCutoff" | "contextWindow" | "maxOutput" | "openness" | "apiAvailable" | "freeAccess"
>;

type ModelSeed = Pick<
  AIModel,
  "id" | "name" | "providerId" | "description" | "version" | "type" | "bestFor" | "tags"
> & {
  source: Source;
  flags: Partial<Record<Capability, boolean>>;
  capabilityNotes?: Partial<Record<Capability, string>>;
  asOf?: string;
  facts?: Partial<ModelFacts>;
  prices?: Partial<Pick<AIModel["pricing"], "input" | "output" | "subscription">>;
  rank: number;
  trending?: boolean;
  rationale: string;
  website?: string;
  apiDocs?: string | null;
  status?: AIModel["status"];
  released?: { date: string; source: Source; description: string };
  releases?: ModelRelease[];
  benchmarks?: AIModel["benchmarks"];
};

function model(entry: ModelSeed): AIModel {
  const release: ModelRelease[] = entry.released
    ? [{
        id: `${entry.id}-release`,
        date: entry.released.date,
        title: `${entry.name} version release`,
        description: entry.released.description,
        type: "release",
        source: entry.released.source,
      }]
    : [];

  return {
    id: entry.id,
    slug: entry.id,
    name: entry.name,
    providerId: entry.providerId,
    description: entry.description,
    version: entry.version,
    type: entry.type,
    status: entry.status ?? "available",
    releaseDate: entry.released
      ? known(entry.released.date, entry.released.source, entry.released.description, entry.released.date)
      : unknown("Exact launch day was not verified. The catalog check date is not a release date."),
    knowledgeCutoff: unknown("No exact knowledge cutoff verified; live search is a separate capability."),
    contextWindow: unknown("No comparable context-token limit verified for this version."),
    maxOutput: unknown("No documented hard output-token limit verified. Example generation settings are not limits."),
    openness: unknown("The cited source does not establish a downloadable-weight license."),
    apiAvailable: unknown("A currently supported first-party hosted endpoint was not verified."),
    freeAccess: unknown("No per-version free hosted tier verified. Product access and API billing are separate."),
    ...entry.facts,
    speed: unknown("No standardized latency or tokens-per-second measurements collected. Marketing speed claims are not measurements."),
    capabilities: capabilities(entry.source, entry.flags, entry.capabilityNotes, entry.asOf),
    pricing: {
      input: unknown("No verified, comparable USD price per million input text tokens."),
      output: unknown("No verified, comparable USD price per million output text tokens."),
      subscription: unknown("Subscriptions belong to provider products, not individual model API versions; no plan price verified here."),
      currency: "USD",
      unit: "1M tokens",
      ...entry.prices,
    },
    website: entry.website ?? entry.source.url,
    apiDocs: entry.apiDocs === undefined ? entry.source.url : entry.apiDocs,
    bestFor: entry.bestFor,
    tags: entry.tags,
    benchmarks: entry.benchmarks ?? [],
    releases: [...release, ...(entry.releases ?? [])],
    editorial: {
      rank: entry.rank,
      trending: entry.trending ?? false,
      rationale: `Editorial selection: ${entry.rationale} Rank and trending are curated, not measured popularity or a cross-model benchmark.`,
      updatedAt: CHECKED,
    },
    addedAt: CHECKED,
    updatedAt: CHECKED,
  };
}

function provider(entry: Omit<Provider, "country" | "founded" | "updatedAt">): Provider {
  return {
    ...entry,
    country: null,
    founded: null,
    updatedAt: CHECKED,
  };
}

const hostedNote = "Hosted model access; no open-weight release is specified in the cited API documentation.";
const weightsNote = "Downloadable weights under the stated license. This is not a free hosted API; infrastructure costs and license conditions still apply.";
const basePriceNote = "Standard, uncached text-token API rate in USD; taxes, optional tools, caching, and other service tiers are separate.";

export const seedCatalog: Catalog = {
  updatedAt: SNAPSHOT,
  providers: [
    provider({
      id: "openai", slug: "openai", name: "OpenAI",
      description: "Develops GPT language, image, and speech models. ChatGPT is a product that can expose several models; it is not itself a model version.",
      website: "https://openai.com", color: "#10A37F", logo: "/logos/openai.svg",
      products: [
        { name: "ChatGPT", description: "Consumer and workplace assistant; model availability depends on the plan.", url: "https://chatgpt.com" },
        { name: "OpenAI API", description: "Developer access with model-specific endpoints and usage billing.", url: "https://developers.openai.com/api/docs" },
      ],
      sources: [sources.openaiSol, sources.openaiMini, sources.openaiImage, sources.openaiSpeech],
    }),
    provider({
      id: "anthropic", slug: "anthropic", name: "Anthropic",
      description: "Creates the Claude model family for writing, analysis, and tool-using applications. Claude the app and the Claude API are distinct access products.",
      website: "https://www.anthropic.com", color: "#D97757", logo: "/logos/anthropic.svg",
      products: [
        { name: "Claude", description: "Assistant application; plan access is separate from API token billing.", url: "https://claude.ai" },
        { name: "Claude API", description: "Programmatic Messages API and developer tooling.", url: "https://platform.claude.com/docs" },
      ],
      sources: [sources.anthropicModels, sources.anthropicOpus, sources.anthropicSonnet],
    }),
    provider({
      id: "google", slug: "google", name: "Google",
      description: "Offers Gemini multimodal models and Veo video generation through developer APIs, alongside the separate Gemini assistant product.",
      website: "https://deepmind.google", color: "#4285F4", logo: "/logos/google.svg",
      products: [
        { name: "Gemini", description: "Google's consumer assistant experience, not one fixed model.", url: "https://gemini.google.com" },
        { name: "Google AI Studio", description: "A browser workspace for experimenting with the Gemini API.", url: "https://aistudio.google.com" },
        { name: "Gemini API", description: "Model endpoints for text, multimodal tasks, and media generation.", url: "https://ai.google.dev" },
      ],
      sources: [sources.geminiModels, sources.geminiFlash, sources.geminiPro, sources.veo],
    }),
    provider({
      id: "xai", slug: "xai", name: "xAI",
      description: "Develops Grok models and developer APIs. Current documentation uses SpaceXAI branding; this catalog retains the familiar xAI provider label.",
      website: "https://x.ai", color: "#18181B", logo: "/logos/xai.svg",
      products: [
        { name: "Grok", description: "Assistant application; real-time search is a product/tool feature.", url: "https://grok.com" },
        { name: "xAI API", description: "Developer model, search, image, and voice APIs.", url: "https://docs.x.ai" },
      ],
      sources: [sources.grok, sources.grokModels],
    }),
    provider({
      id: "deepseek", slug: "deepseek", name: "DeepSeek",
      description: "Publishes reasoning and language model weights and runs a chat service. The seed verifies the V3.2 weight artifact; live API documentation was unreachable during this check.",
      website: "https://www.deepseek.com", color: "#4D6BFE", logo: "/logos/deepseek.svg",
      products: [
        { name: "DeepSeek Chat", description: "Hosted chat application; the active model can change.", url: "https://chat.deepseek.com" },
        { name: "DeepSeek model weights", description: "Official downloadable checkpoints and model cards.", url: "https://huggingface.co/deepseek-ai" },
      ],
      sources: [sources.deepseek, sources.deepseekConfig],
    }),
    provider({
      id: "meta", slug: "meta", name: "Meta",
      description: "Publishes the Llama family of downloadable models with model-specific community license conditions. Meta AI is a separate assistant product.",
      website: "https://ai.meta.com", color: "#0866FF", logo: "/logos/meta.svg",
      products: [
        { name: "Meta AI", description: "Consumer assistant across Meta's experiences.", url: "https://www.meta.ai" },
        { name: "Llama", description: "Model weights, documentation, and the developer ecosystem.", url: "https://www.llama.com" },
      ],
      sources: [sources.llama],
    }),
    provider({
      id: "mistral", slug: "mistral", name: "Mistral AI",
      description: "Develops hosted and downloadable language and vision models. Le Chat and Mistral AI Studio are products, while Small 3.2 is a specific model snapshot.",
      website: "https://mistral.ai", color: "#FF7000", logo: "/logos/mistral.svg",
      products: [
        { name: "Le Chat", description: "Mistral's assistant application.", url: "https://chat.mistral.ai" },
        { name: "Mistral AI Studio", description: "Developer platform for API access and deployments.", url: "https://console.mistral.ai" },
      ],
      sources: [sources.mistral, sources.mistralConfig, sources.mistralProducts],
    }),
    provider({
      id: "qwen", slug: "qwen", name: "Alibaba / Qwen",
      description: "Alibaba's Qwen team publishes general and coding model families, including Apache-licensed downloadable checkpoints.",
      website: "https://qwen.ai", color: "#615CED", logo: "/logos/qwen.svg",
      products: [
        { name: "Qwen Chat", description: "Assistant interface for Qwen models; not a fixed model version.", url: "https://chat.qwen.ai" },
        { name: "Qwen Code", description: "Open developer tool that can use Qwen coding models.", url: "https://github.com/QwenLM/qwen-code" },
      ],
      sources: [sources.qwen, sources.qwenReleases, sources.qwenCoder, sources.qwenCode],
    }),
    provider({
      id: "microsoft", slug: "microsoft", name: "Microsoft",
      description: "Publishes Phi small language and multimodal models and provides model deployment products. The Phi checkpoint is not the same thing as the Copilot assistant.",
      website: "https://www.microsoft.com", color: "#737373", logo: "/logos/microsoft.svg",
      products: [
        { name: "Microsoft Copilot", description: "Assistant product; its underlying model lineup may change.", url: "https://copilot.microsoft.com" },
        { name: "Microsoft Foundry", description: "Platform for building and deploying AI applications and models.", url: "https://ai.azure.com" },
      ],
      sources: [sources.phi, sources.phiConfig],
    }),
    provider({
      id: "perplexity", slug: "perplexity", name: "Perplexity",
      description: "Builds web-grounded answer and research products. Its current Agent API is distinct from the legacy Sonar Chat Completions service.",
      website: "https://www.perplexity.ai", color: "#20808D", logo: "/logos/perplexity.svg",
      products: [
        { name: "Perplexity", description: "Search and answer application for end users.", url: "https://www.perplexity.ai" },
        { name: "Agent API", description: "Current developer API with models, web search, and other tools.", url: "https://docs.perplexity.ai/docs/agent-api/quickstart" },
      ],
      sources: [sources.sonarMigration, sources.sonarPricing],
    }),
    provider({
      id: "cohere", slug: "cohere", name: "Cohere",
      description: "Develops enterprise language and retrieval models, including Command and Embed. Deployment pricing and North product subscriptions are separate.",
      website: "https://cohere.com", color: "#39594D", logo: "/logos/cohere.svg",
      products: [
        { name: "North", description: "Enterprise AI workspace powered by Cohere models.", url: "https://cohere.com/north" },
        { name: "Cohere Platform", description: "API playground, model access, and managed deployments.", url: "https://dashboard.cohere.com" },
      ],
      sources: [sources.cohereCommand, sources.cohereModels, sources.cohereEmbed, sources.coherePricing],
    }),
    provider({
      id: "black-forest-labs", slug: "black-forest-labs", name: "Black Forest Labs",
      description: "Develops the FLUX image model family, with distinct hosted production models and downloadable variants carrying different licenses.",
      website: "https://bfl.ai", color: "#252525", logo: "/logos/black-forest-labs.svg",
      products: [
        { name: "BFL Playground", description: "Browser interface for trying FLUX image generation and editing.", url: "https://playground.bfl.ai" },
        { name: "FLUX API", description: "Developer image generation endpoints with image/megapixel billing.", url: "https://docs.bfl.ai" },
      ],
      sources: [sources.flux],
    }),
    provider({
      id: "runway", slug: "runway", name: "Runway",
      description: "Provides creative video tools and a developer platform. Gen-4.5 is a Runway model; other providers' models offered by Runway are not reattributed to it.",
      website: "https://runwayml.com", color: "#343434", logo: "/logos/runway.svg",
      products: [
        { name: "Runway", description: "Creative application for generating and editing visual media.", url: "https://app.runwayml.com" },
        { name: "Runway Dev", description: "Developer API with credit-based usage billing.", url: "https://dev.runway.com" },
      ],
      sources: [sources.runway, sources.runwayGuide, sources.runwayPricing],
    }),
  ],
  models: [
    model({
      id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", providerId: "anthropic",
      description: "A current Claude model for coding, writing, and tool-using workflows. Its September 2026 release changes thinking and tool behavior; validate migrations rather than treating model aliases as interchangeable.",
      version: "claude-sonnet-5-5", type: "general", source: sources.anthropicSonnet,
      flags: { text: true, imageInput: true, imageOutput: false, reasoning: true, coding: true, toolCalling: true },
      capabilityNotes: { toolCalling: "Tool use is supported, but forced tool use returns an error in this version." },
      facts: {
        knowledgeCutoff: known("2026-06", sources.anthropicSonnet, "Publisher's reliable knowledge cutoff; the day is not specified."),
        contextWindow: known(1_000_000, sources.anthropicSonnet),
        maxOutput: known(128_000, sources.anthropicSonnet, "Synchronous Messages API limit; the 300k batch beta is not the default."),
        openness: known("proprietary", sources.anthropicSonnet, hostedNote),
        apiAvailable: known(true, sources.anthropicSonnet),
      },
      prices: { input: known(2, sources.anthropicSonnet, basePriceNote), output: known(10, sources.anthropicSonnet, basePriceNote) },
      released: { date: "2026-09-28", source: sources.anthropicSonnet, description: "The official model overview explicitly dates the Sonnet 5.5 release to September 28, 2026." },
      bestFor: ["coding", "writing", "business", "customer-support", "agents"],
      tags: ["Sonnet 5.5", "claude-sonnet-5-5", "Tool use", "Vision"],
      rank: 1, trending: true,
      rationale: "Featured for a newly documented release and a lower base API price than Opus 5.5; recommended as a starting point for your own coding and writing evaluations.",
    }),
    model({
      id: "gpt-6-1-sol", name: "GPT-6.1 Sol", providerId: "openai",
      description: "A reasoning model for coding, computer use, and professional work. Function calling uses the Responses API; the Chat Completions endpoint does not support tools for this version.",
      version: "gpt-6.1-sol", type: "reasoning", source: sources.openaiSol,
      flags: { text: true, imageInput: true, imageOutput: false, audioInput: false, audioOutput: false, videoInput: false, videoOutput: false, reasoning: true, coding: true, toolCalling: true, structuredOutputs: true, webSearch: true, fineTuning: false },
      capabilityNotes: {
        toolCalling: "Supported through Responses API, not Chat Completions.",
        webSearch: "Requires an enabled search tool; not inherent live knowledge.",
        imageOutput: "The base model outputs text. A separately billed image-generation tool is not native image output.",
      },
      facts: {
        knowledgeCutoff: known("2026-04-30", sources.openaiSol),
        contextWindow: known(1_050_000, sources.openaiSol, "Maximum input is 922,000 tokens; total context also includes the output budget."),
        maxOutput: known(128_000, sources.openaiSol),
        openness: known("proprietary", sources.openaiSol, hostedNote),
        apiAvailable: known(true, sources.openaiSol),
      },
      prices: {
        input: known(2, sources.openaiSol, "Standard uncached input at up to 272k prompt tokens. Above 272k, the full request has 2x input/cache rates. Tools and regional processing are extra."),
        output: known(10, sources.openaiSol, "Standard output at up to 272k prompt tokens. Above 272k, output is 1.5x for the full request. Fast, Batch, and Flex rates differ."),
      },
      bestFor: ["coding", "data-analysis", "business", "research", "agents"],
      tags: ["GPT-6.1", "gpt-6.1-sol", "Responses API", "Reasoning"],
      rank: 2, trending: true,
      rationale: "Featured for its documented professional-tool workflow and explicit long-context pricing; no claim that it wins every task.",
    }),
    model({
      id: "gemini-3-8-flash", name: "Gemini 3.8 Flash", providerId: "google",
      description: "Google's generally available Flash model for coding, agents, and enterprise tasks. The published launch offer is temporary, so compare the introductory and standard rates before budgeting.",
      version: "gemini-3.8-flash", type: "general", source: sources.geminiFlash,
      flags: { text: true, reasoning: true, coding: true, toolCalling: true },
      facts: {
        contextWindow: known(1_000_000, sources.geminiFlash, "Published as a 1M-token context window."),
        maxOutput: known(64_000, sources.geminiFlash, "Published as 64k; retained at the precision of this guide rather than inferring a binary token limit."),
        openness: known("proprietary", sources.geminiFlash, hostedNote),
        apiAvailable: known(true, sources.geminiFlash),
      },
      prices: {
        input: known(0.75, sources.geminiFlash, "Introductory input rate through December 31, 2026. The guide lists $1.50/1M from January 1, 2027."),
        output: known(3.75, sources.geminiFlash, "Introductory output rate through December 31, 2026. The guide lists $7.50/1M from January 1, 2027."),
      },
      bestFor: ["coding", "business", "data-analysis", "agents", "general"],
      tags: ["Gemini 3.8", "gemini-3.8-flash", "GA", "Introductory pricing"],
      rank: 3, trending: true,
      rationale: "Featured for an officially documented current GA model and a time-limited price offer; actual workload latency and token use still need measurement.",
    }),
    model({
      id: "claude-opus-5-5", name: "Claude Opus 5.5", providerId: "anthropic",
      description: "A Claude model oriented toward long-running agentic coding and knowledge work. Adaptive thinking is always on; the default thinking display can change streamed progress behavior.",
      version: "claude-opus-5-5", type: "reasoning", source: sources.anthropicOpus,
      flags: { text: true, imageInput: true, imageOutput: false, reasoning: true, coding: true, toolCalling: true },
      capabilityNotes: { reasoning: "Adaptive thinking is always on in this model version.", toolCalling: "Tool use is supported; forced tool use is not supported." },
      facts: {
        knowledgeCutoff: known("2026-06", sources.anthropicOpus, "Reliable knowledge cutoff is published to month precision."),
        contextWindow: known(1_000_000, sources.anthropicOpus),
        maxOutput: known(128_000, sources.anthropicOpus, "Synchronous Messages API limit. A separate batch beta supports larger outputs."),
        openness: known("proprietary", sources.anthropicOpus, hostedNote),
        apiAvailable: known(true, sources.anthropicOpus),
      },
      prices: { input: known(4, sources.anthropicOpus, basePriceNote), output: known(20, sources.anthropicOpus, basePriceNote) },
      released: { date: "2026-09-22", source: sources.anthropicOpus, description: "Anthropic's version page gives September 22, 2026 as the release date." },
      bestFor: ["coding", "research", "writing", "data-analysis", "agents"],
      tags: ["Opus 5.5", "claude-opus-5-5", "Adaptive thinking", "Vision"],
      rank: 7,
      rationale: "Retained after the cross-provider picks for documented long-horizon work and its recent release; the higher output price is a meaningful trade-off versus Sonnet.",
    }),
    model({
      id: "grok-4-7", name: "Grok 4.7", providerId: "xai",
      description: "A text-and-image reasoning model for coding, knowledge work, and agents. Current information requires explicitly enabled web or X search tools.",
      version: "grok-4.7", type: "reasoning", source: sources.grok,
      flags: { text: true, imageInput: true, imageOutput: false, reasoning: true, coding: true, toolCalling: true, structuredOutputs: true },
      capabilityNotes: { webSearch: "The model catalog documents opt-in Web Search/X Search. Search is not inherent knowledge." },
      facts: {
        knowledgeCutoff: known("2026-05", sources.grokModels, "Knowledge cutoff is published to month precision."),
        contextWindow: known(500_000, sources.grok),
        openness: known("proprietary", sources.grok, hostedNote),
        apiAvailable: known(true, sources.grok),
      },
      prices: {
        input: known(2, sources.grok, "Uncached input for prompts below 200k tokens; at or above 200k, the full request uses $4/1M input."),
        output: known(6, sources.grok, "Output for prompts below 200k tokens; at or above 200k, the full request uses $12/1M output. Search costs are separate."),
      },
      bestFor: ["coding", "research", "business", "agents"],
      tags: ["Grok 4.7", "grok-4.7", "Reasoning", "Vision"],
      rank: 4, trending: true,
      rationale: "Selected to represent xAI in a provider-diverse slate of tool-using models; the documented long-prompt price step is a trade-off, not a popularity measure.",
    }),
    model({
      id: "gpt-5-4-mini", name: "GPT-5.4 Mini", providerId: "openai",
      description: "A smaller GPT-5.4-family model aimed at coding, computer use, and high-volume workloads. This record names the March 2026 snapshot rather than a consumer subscription.",
      version: "gpt-5.4-mini-2026-03-17", type: "coding", source: sources.openaiMini,
      flags: { text: true, imageInput: true, imageOutput: false, audioInput: false, audioOutput: false, videoInput: false, videoOutput: false, reasoning: true, coding: true, toolCalling: true, structuredOutputs: true, webSearch: true, fineTuning: false },
      capabilityNotes: { webSearch: "Search is an optional Responses API tool, with separate tool charges." },
      facts: {
        knowledgeCutoff: known("2025-08-31", sources.openaiMini),
        contextWindow: known(400_000, sources.openaiMini, "Maximum input is 272,000 tokens; the context budget includes up to 128,000 output tokens."),
        maxOutput: known(128_000, sources.openaiMini),
        openness: known("proprietary", sources.openaiMini, hostedNote),
        apiAvailable: known(true, sources.openaiMini),
      },
      prices: {
        input: known(0.75, sources.openaiMini, `${basePriceNote} Regional processing adds a 10% uplift.`),
        output: known(4.5, sources.openaiMini, `${basePriceNote} Regional processing adds a 10% uplift.`),
      },
      released: { date: "2026-03-17", source: sources.openaiMini, description: "Date of the explicitly listed gpt-5.4-mini-2026-03-17 snapshot, not the first GPT-family release." },
      bestFor: ["coding", "customer-support", "school", "agents", "general"],
      tags: ["GPT-5.4 Mini", "2026-03-17", "Tool use", "Vision"],
      rank: 8,
      rationale: "Retained as a lower-priced, version-pinned OpenAI comparison point, not assumed to be the newest or fastest mini model.",
    }),
    model({
      id: "deepseek-v3-2", name: "DeepSeek V3.2", providerId: "deepseek",
      description: "A downloadable DeepSeek reasoning and tool-use checkpoint. This is a weight-artifact snapshot, not a claim about the current DeepSeek Chat backend; live API documentation could not be reached during verification.",
      version: "DeepSeek-V3.2", type: "reasoning", source: sources.deepseek,
      flags: { text: true, reasoning: true, toolCalling: true, selfHosting: true },
      facts: {
        contextWindow: known(163_840, sources.deepseekConfig, "Checkpoint max_position_embeddings. This is not a verified hosted API context limit."),
        openness: known("open-weights", sources.deepseek, "MIT-licensed weights in the official model card; not a claim that every training artifact is public."),
        freeAccess: known(true, sources.deepseek, weightsNote),
        apiAvailable: unknown("Live DeepSeek API documentation was unreachable. A previous API alias or price is not treated as current."),
      },
      apiDocs: null,
      website: "https://huggingface.co/deepseek-ai/DeepSeek-V3.2",
      bestFor: ["research", "data-analysis", "agents", "coding"],
      tags: ["DeepSeek V3.2", "DeepSeek-V3.2", "MIT", "Weight snapshot"],
      rank: 5, trending: true,
      rationale: "Curated for provider diversity and self-hostable reasoning, not current API popularity; this weight snapshot's deployment demands and live API terms still need evaluation.",
    }),
    model({
      id: "qwen3-coder-next", name: "Qwen3-Coder-Next", providerId: "qwen",
      description: "An open-weight coding-agent model with hybrid attention and a mixture-of-experts architecture. The model card explicitly describes a non-thinking checkpoint and offers self-hosted API examples.",
      version: "Qwen3-Coder-Next", type: "coding", source: sources.qwenCoder,
      flags: { text: true, coding: true, toolCalling: true, selfHosting: true },
      capabilityNotes: { reasoning: "This checkpoint does not emit dedicated thinking blocks. That is not a claim that it cannot solve reasoning tasks." },
      facts: {
        contextWindow: known(262_144, sources.qwenCoder, "Native checkpoint context; actual deployment capacity depends on hardware and server configuration."),
        openness: known("open-weights", sources.qwenCoder, "Apache-2.0 weights; openness here does not assert public access to all training data."),
        freeAccess: known(true, sources.qwenCoder, weightsNote),
        apiAvailable: known(true, sources.qwenCoder, "Publisher demonstrates a self-hosted OpenAI-compatible endpoint; this is not a verified free hosted API."),
      },
      website: "https://huggingface.co/Qwen/Qwen3-Coder-Next",
      bestFor: ["coding", "agents"],
      tags: ["Qwen3-Coder-Next", "80B-A3B", "Apache-2.0", "Self-hosted"],
      rank: 6, trending: true,
      rationale: "Curated coding pick for the provider-diverse slate, with Apache-licensed weights and self-hosted API examples; no universal coding-leaderboard claim is implied.",
    }),
    model({
      id: "command-a-plus-05-2026", name: "Command A+", providerId: "cohere",
      description: "Cohere's multimodal mixture-of-experts Command model for enterprise agents, reasoning, and multilingual work. The official card also links an Apache-2.0 W4A4 downloadable deployment.",
      version: "command-a-plus-05-2026", type: "general", source: sources.cohereCommand,
      flags: { text: true, imageInput: true, imageOutput: false, reasoning: true, toolCalling: true, multilingual: true, selfHosting: true },
      facts: {
        contextWindow: known(128_000, sources.cohereModels, "Cohere's model table publishes the limit as 128k."),
        maxOutput: known(64_000, sources.cohereModels, "Cohere's model table publishes the limit as 64k."),
        openness: known("open-weights", sources.cohereCommand, "The official card links Apache-2.0 command-a-plus-05-2026-w4a4 weights; commercial hosted deployment has separate terms."),
        apiAvailable: known(true, sources.cohereModels, "Live on Cohere's Chat endpoint, subject to account and deployment terms."),
        freeAccess: known(true, sources.cohereCommand, `${weightsNote} The cited downloadable artifact is the W4A4 variant.`),
      },
      released: { date: "2026-05-20", source: sources.cohereCommand, description: "Cohere's model card explicitly gives May 20, 2026 as the release date." },
      bestFor: ["business", "customer-support", "agents", "research"],
      tags: ["Command A+", "05-2026", "Vision", "Enterprise"],
      rank: 9,
      rationale: "Diversifies the shortlist with documented multilingual, multimodal enterprise workflows and a downloadable deployment path.",
    }),
    model({
      id: "mistral-small-3-2-2506", name: "Mistral Small 3.2", providerId: "mistral",
      description: "The June 2025 Small 3.2 instruction checkpoint, with vision and a revised function-calling template. Retained as an explicitly historical, downloadable comparison point rather than Mistral's latest model.",
      version: "Mistral-Small-3.2-24B-Instruct-2506", type: "general", source: sources.mistral,
      flags: { text: true, imageInput: true, toolCalling: true, multilingual: true, selfHosting: true },
      facts: {
        releaseDate: unknown("The 2506 identifier establishes a June 2025 snapshot, but an exact launch day was not verified.", sources.mistral),
        contextWindow: known(131_072, sources.mistralConfig, "max_position_embeddings of the 2506 checkpoint, not an assertion about a current API alias."),
        openness: known("open-weights", sources.mistral, "Apache-2.0 downloadable checkpoint."),
        freeAccess: known(true, sources.mistral, weightsNote),
        apiAvailable: known(true, sources.mistral, "Publisher documents serving this checkpoint with vLLM; current first-party hosted availability was not verified."),
      },
      website: "https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506",
      bestFor: ["customer-support", "business", "writing", "general"],
      tags: ["Small 3.2", "2506", "24B", "Historical snapshot"],
      rank: 10,
      rationale: "Offers a clearly identified, self-hostable vision baseline; historical checkpoints remain useful without being presented as recent launches.",
    }),
    model({
      id: "phi-4-multimodal-instruct", name: "Phi-4 Multimodal", providerId: "microsoft",
      description: "Microsoft's Phi-4 multimodal instruction checkpoint accepts text, images, and audio and produces text. Its model card targets constrained deployments, document understanding, and speech-related tasks.",
      version: "Phi-4-multimodal-instruct", type: "general", source: sources.phi,
      flags: { text: true, imageInput: true, imageOutput: false, audioInput: true, audioOutput: false, multilingual: true, toolCalling: true, selfHosting: true },
      capabilityNotes: {
        multilingual: "Supported languages differ by modality; the model card documents text, vision, and audio separately.",
        videoInput: "The card discusses video-clip summarization via images; native video-file input has not been verified.",
      },
      facts: {
        contextWindow: known(131_072, sources.phiConfig, "Checkpoint max_position_embeddings; different serving platforms may impose smaller limits."),
        openness: known("open-weights", sources.phi, "MIT-licensed downloadable checkpoint."),
        freeAccess: known(true, sources.phi, weightsNote),
      },
      website: "https://huggingface.co/microsoft/Phi-4-multimodal-instruct",
      bestFor: ["school", "data-analysis", "customer-support", "general"],
      tags: ["Phi-4", "multimodal-instruct", "MIT", "Audio input"],
      rank: 11,
      rationale: "Adds a downloadable speech-and-vision option for constrained deployment and learning; hosted costs are intentionally not inferred.",
    }),
    model({
      id: "llama-4-scout", name: "Llama 4 Scout", providerId: "meta",
      description: "Meta's April 2025 Scout instruction model for multilingual text and image understanding. The advertised long context and custom community license need workload-specific evaluation.",
      version: "Llama-4-Scout-17B-16E-Instruct", type: "general", source: sources.llama, asOf: "2025-04-05",
      flags: { text: true, imageInput: true, imageOutput: false, coding: true, multilingual: true, fineTuning: true, selfHosting: true },
      facts: {
        knowledgeCutoff: known("2024-08", sources.llama, "Month-level cutoff in the static model card.", "2025-04-05"),
        contextWindow: known(10_000_000, sources.llama, "Publisher's 10M-token checkpoint claim; not an independently measured usable context or an API limit.", "2025-04-05"),
        openness: known("open-weights", sources.llama, "Custom Llama 4 Community License; not an OSI open-source license.", "2025-04-05"),
      },
      released: { date: "2025-04-05", source: sources.llama, description: "Meta's model card gives April 5, 2025 as the Llama 4 collection release date." },
      website: "https://www.llama.com",
      bestFor: ["research", "writing", "business", "general"],
      tags: ["Llama 4", "Scout 17B-16E", "Community license", "Historical snapshot"],
      rank: 12,
      rationale: "Retained for long-context and licensing comparisons, with the advertised capacity clearly separated from measured retrieval quality.",
    }),
    model({
      id: "gemini-3-1-pro-preview", name: "Gemini 3.1 Pro Preview", providerId: "google",
      description: "A versioned Gemini reasoning preview for complex multimodal and coding tasks. The Gemini 3 guide is a snapshot-specific reference; the newer Flash lineup has separate availability and pricing.",
      version: "gemini-3.1-pro-preview", type: "reasoning", source: sources.geminiPro, status: "preview",
      flags: { text: true, reasoning: true, coding: true, toolCalling: true },
      facts: {
        knowledgeCutoff: known("2025-01", sources.geminiPro, "Knowledge cutoff reported for this preview in the Gemini 3 guide."),
        contextWindow: known(1_000_000, sources.geminiPro, "Guide reports 1M input context."),
        maxOutput: known(64_000, sources.geminiPro, "Guide reports 64k output; no more precise limit inferred."),
        openness: known("proprietary", sources.geminiPro, hostedNote),
        apiAvailable: known(true, sources.geminiPro),
      },
      prices: {
        input: known(2, sources.geminiPro, "Published short-prompt tier, below 200k tokens. The guide lists $4/1M for the longer-prompt tier."),
        output: known(12, sources.geminiPro, "Published short-prompt tier, below 200k tokens. The guide lists $18/1M for the longer-prompt tier; tool fees are separate."),
      },
      bestFor: ["research", "coding", "data-analysis", "school", "agents"],
      tags: ["Gemini 3.1", "gemini-3.1-pro-preview", "Preview", "Reasoning"],
      rank: 13,
      rationale: "Offers a distinct Pro preview for comparison with Flash; preview stability and tiered pricing are explicit trade-offs.",
    }),
    model({
      id: "qwen3-235b-a22b-instruct-2507", name: "Qwen3 235B Instruct 2507", providerId: "qwen",
      description: "The July 2025 non-thinking Qwen3 instruction checkpoint. This historical snapshot includes publisher-reported evaluations, not independently reproduced benchmark results.",
      version: "Qwen3-235B-A22B-Instruct-2507", type: "general", source: sources.qwen, asOf: "2025-07-21",
      flags: { text: true, coding: true, toolCalling: true, multilingual: true, selfHosting: true },
      capabilityNotes: { reasoning: "The publisher calls this a non-thinking model; benchmark reasoning ability is not a separately verified thinking mode." },
      facts: {
        contextWindow: known(262_144, sources.qwen, "Native checkpoint context. The separately described extrapolated context is not the native limit.", "2025-07-21"),
        openness: known("open-weights", sources.qwen, "Apache-2.0 model weights.", "2025-07-21"),
        freeAccess: known(true, sources.qwen, weightsNote),
      },
      released: { date: "2025-07-21", source: sources.qwenReleases, description: "The official release history dates Qwen3-235B-A22B-Instruct-2507 to July 21, 2025." },
      benchmarks: [
        {
          id: "mmlu-pro-publisher", name: "MMLU-Pro · publisher report", score: "83.0%",
          date: "2025-07-21", source: sources.qwen,
          note: "Model-card result, not independently reproduced. Date is the checkpoint's publication date, not a verified evaluation-run date. Harness/settings differ between publishers.",
        },
        {
          id: "gpqa-publisher", name: "GPQA · publisher report", score: "77.5%",
          date: "2025-07-21", source: sources.qwen,
          note: "The card labels this GPQA, not GPQA Diamond. Date is checkpoint publication; no evaluation-run day was supplied. Do not treat this as a directly comparable leaderboard score.",
        },
      ],
      website: "https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507",
      bestFor: ["writing", "school", "business", "general"],
      tags: ["Qwen3", "235B-A22B-Instruct-2507", "Apache-2.0", "Historical snapshot"],
      rank: 14,
      rationale: "Keeps a reproducible open-weight baseline and transparently sourced historical evaluations; those scores do not determine this catalog's rank.",
    }),
    model({
      id: "flux-2-pro", name: "FLUX.2 [pro]", providerId: "black-forest-labs",
      description: "A fixed FLUX.2 production image generation and editing snapshot. It supports multiple image references and is distinct from the changing pro-preview endpoint and downloadable dev/klein variants.",
      version: "flux-2-pro", type: "image", source: sources.flux,
      flags: { text: false, imageInput: true, imageOutput: true, webSearch: false },
      capabilityNotes: { webSearch: "The FLUX.2 guide reserves grounding search for [max], not [pro]." },
      facts: {
        contextWindow: unknown("Image generation does not have a verified text-context limit comparable to chat models.", sources.flux),
        maxOutput: unknown("Output is image pixels, not generated text tokens.", sources.flux),
        openness: known("proprietary", sources.flux, "Hosted [pro] endpoint. Licenses for [dev] or [klein] must not be assigned to [pro]."),
        apiAvailable: known(true, sources.flux),
      },
      prices: {
        input: unknown("No normalized text-token input tariff. The API bills media generation rather than a chat-token pair.", sources.flux),
        output: unknown("Official guide lists [pro] pricing from $0.03 per megapixel. This is not a price per million text tokens.", sources.flux),
      },
      bestFor: ["image-creation", "business"],
      tags: ["FLUX.2", "flux-2-pro", "Fixed snapshot", "Image editing"],
      rank: 15,
      rationale: "Adds a reproducible production-image option; media billing is deliberately excluded from text-token cost comparisons.",
    }),
    model({
      id: "gpt-image-1-5", name: "GPT Image 1.5", providerId: "openai",
      description: "A version-pinned image generation and editing model, now described by OpenAI as a previous image model. Its text and image token tariffs are different and should not be collapsed into one chat price.",
      version: "gpt-image-1.5-2025-12-16", type: "image", source: sources.openaiImage,
      flags: { text: true, imageInput: true, imageOutput: true, fineTuning: false },
      capabilityNotes: { text: "The model reference lists image and text outputs; this is not a general chat-completions model." },
      facts: {
        openness: known("proprietary", sources.openaiImage, hostedNote),
        apiAvailable: known(true, sources.openaiImage),
        maxOutput: unknown("Image size/quality and output modality determine generation limits; no comparable text-token maximum verified.", sources.openaiImage),
      },
      prices: {
        input: unknown("Separate rates: $5/1M text input tokens and $8/1M image input tokens. A single normalized input rate would hide that distinction.", sources.openaiImage),
        output: unknown("Image output is $32/1M image tokens; text output is $10/1M text tokens. Per-image costs also depend on resolution and quality.", sources.openaiImage),
      },
      released: { date: "2025-12-16", source: sources.openaiImage, description: "Date encoded in the explicitly documented gpt-image-1.5-2025-12-16 snapshot." },
      bestFor: ["image-creation", "business"],
      tags: ["GPT Image 1.5", "2025-12-16", "Image generation", "Previous generation"],
      rank: 16,
      rationale: "Provides an explicitly older, pinned image-generation comparator rather than mislabeling it as OpenAI's newest image model.",
    }),
    model({
      id: "veo-3-1", name: "Veo 3.1", providerId: "google",
      description: "Google's video model with native audio, video extension, frame-specific generation, and image-based direction. The current guide recommends Gemini Omni Flash for many new workflows and Veo for particular controls.",
      version: "Veo 3.1", type: "video", source: sources.veo,
      flags: { text: false, imageInput: true, videoInput: true, videoOutput: true, audioOutput: true },
      capabilityNotes: { videoInput: "Documented for video extension; not a general-purpose video-understanding claim." },
      facts: {
        contextWindow: unknown("Not a comparable chat-token context window.", sources.veo),
        maxOutput: unknown("Video duration and resolution, not a text-token output budget, govern generation.", sources.veo),
        openness: known("proprietary", sources.veo, hostedNote),
        apiAvailable: known(true, sources.veo),
      },
      prices: {
        input: unknown("No first-party token-normalized price verified. Do not substitute a reseller's video rate.", sources.veo),
        output: unknown("Video/audio generation is not billed as this catalog's text-token pair; consult the provider's current video pricing.", sources.veo),
      },
      bestFor: ["video-creation", "business"],
      tags: ["Veo 3.1", "3.1 video", "Native audio", "Video extension"],
      rank: 17,
      rationale: "Included for documented frame and extension controls, with the provider's newer default recommendation made explicit.",
    }),
    model({
      id: "runway-gen-4-5", name: "Runway Gen-4.5", providerId: "runway",
      description: "Runway's Gen-4.5 video model, with documented image-to-video API support and professional delivery formats. Optional formats can carry extra charges.",
      version: "gen4.5", type: "video", source: sources.runwayGuide,
      flags: { text: false, imageInput: true, videoOutput: true },
      facts: {
        contextWindow: unknown("Video generation has no verified, comparable chat-token context limit.", sources.runwayGuide),
        maxOutput: unknown("Output is a video, not a generated text-token budget.", sources.runwayGuide),
        openness: known("proprietary", sources.runwayGuide, hostedNote),
        apiAvailable: known(true, sources.runwayGuide),
      },
      prices: {
        input: unknown("Runway bills media jobs in credits, not a comparable input text-token tariff.", sources.runwayPricing),
        output: unknown("Gen-4.5 base generation is 12 credits per second; credits are $0.01 each before applicable tax. Professional/HDR formats may add charges. Not a per-million-token rate.", sources.runwayPricing),
      },
      bestFor: ["video-creation", "business"],
      tags: ["Gen-4.5", "gen4.5", "Image to video", "Credit billing"],
      rank: 18,
      rationale: "Adds a creative-video alternative with documented developer billing; no invented quality score or render-time estimate.",
    }),
    model({
      id: "gpt-4o-mini-tts", name: "GPT-4o Mini TTS", providerId: "openai",
      description: "The December 2025 text-to-speech snapshot of GPT-4o Mini TTS. It takes text and produces speech; audio token billing is not equivalent to chat output billing.",
      version: "gpt-4o-mini-tts-2025-12-15", type: "speech", source: sources.openaiSpeech,
      flags: { text: false, audioInput: false, audioOutput: true, imageOutput: false, videoOutput: false, fineTuning: false },
      facts: {
        contextWindow: known(2000, sources.openaiSpeech, "Maximum input tokens, not a bidirectional chat context."),
        maxOutput: unknown("No text-output budget: the model generates audio.", sources.openaiSpeech),
        openness: known("proprietary", sources.openaiSpeech, hostedNote),
        apiAvailable: known(true, sources.openaiSpeech),
      },
      prices: {
        input: known(0.6, sources.openaiSpeech, "USD per million text input tokens for speech generation."),
        output: unknown("The published rate is $12 per million AUDIO output tokens. It is intentionally not used as a text-output estimate.", sources.openaiSpeech),
      },
      released: { date: "2025-12-15", source: sources.openaiSpeech, description: "Date of the documented December 15, 2025 TTS snapshot, distinct from the original March 2025 release." },
      bestFor: ["customer-support", "school", "business"],
      tags: ["GPT-4o Mini TTS", "2025-12-15", "Speech generation", "Audio billing"],
      rank: 19,
      rationale: "Represents the speech-generation use case without pretending that audio output costs are directly comparable with text models.",
    }),
    model({
      id: "embed-v5-0-pro", name: "Embed v5.0 Pro", providerId: "cohere",
      description: "Cohere's text-and-image embedding model for semantic search, clustering, and retrieval. It returns numerical vectors rather than chat answers.",
      version: "embed-v5.0-pro", type: "embedding", source: sources.cohereEmbed,
      flags: { text: false, imageInput: true, imageOutput: false, multilingual: true },
      capabilityNotes: { text: "Accepts text as input but returns embedding vectors, not generated prose." },
      facts: {
        contextWindow: known(128_000, sources.cohereEmbed, "Model table publishes a 128k context limit."),
        maxOutput: unknown("Returns embedding vectors, not output text tokens. Vector dimensions are a different quantity.", sources.cohereEmbed),
        apiAvailable: known(true, sources.cohereEmbeddings, "The official example explicitly calls embed-v5.0-pro through the Embed endpoint."),
      },
      prices: { output: unknown("An embedding vector is not a billed text-generation output stream.", sources.cohereEmbed) },
      bestFor: ["research", "data-analysis", "customer-support", "business"],
      tags: ["Embed v5.0", "embed-v5.0-pro", "Embeddings", "Multimodal retrieval"],
      rank: 20,
      rationale: "Adds a retrieval building block rather than another chatbot; its rank is category curation, not a claim that embeddings are worse than language models.",
    }),
    model({
      id: "sonar-pro", name: "Sonar Pro (legacy)", providerId: "perplexity",
      description: "A retained legacy Sonar Pro research record. Sonar Chat Completions support ended September 27, 2026; synchronous calls may now be reformulated as Agent API requests, so they do not guarantee the original model.",
      version: "sonar-pro", type: "research", source: sources.sonarMigration, status: "deprecated",
      flags: { text: true, webSearch: true, structuredOutputs: true },
      capabilityNotes: {
        webSearch: "Historical Sonar service capability. New development should use Agent API.",
        structuredOutputs: "Listed in Perplexity's Sonar versus Agent API migration table.",
      },
      facts: {
        apiAvailable: unknown("Legacy synchronous/streaming requests may be reformulated; original-model availability is not guaranteed. Async Sonar requests are no longer supported.", sources.sonarMigration),
      },
      prices: {
        input: known(3, sources.sonarPricing, "Legacy Sonar Pro rate retained in the pricing source, not a quote for the current Agent API. Search/request charges are additional."),
        output: known(15, sources.sonarPricing, "Legacy Sonar Pro rate, not a current Agent API model quote. Per-request charges vary by search context."),
      },
      releases: [{
        id: "sonar-support-ended-2026-09-27", date: "2026-09-27", title: "Sonar Chat Completions support ended",
        description: "Perplexity recommends Agent API for new work. Legacy synchronous/streaming requests are being reformulated; asynchronous Sonar requests are no longer supported.",
        type: "deprecation", source: sources.sonarMigration,
      }],
      bestFor: ["research"],
      tags: ["Sonar Pro", "sonar-pro", "Legacy snapshot", "Migration required"],
      rank: 21,
      rationale: "Kept for migration awareness and historical comparison, not recommended as a new deployment choice or marked trending.",
    }),
  ].sort((left, right) => left.editorial.rank - right.editorial.rank),
};
