import type { Catalog, ChangelogEntry } from "../lib/types";
import { benchmarkDefinitions } from "./benchmarks";
import { buildModel, buildProvider, CHECKED, type ProviderFile } from "./define";
import { providerFiles } from "./providers";

/**
 * Editorial starting order for "featured" sorting. This is a curation order for
 * browsing, not a measured quality or popularity ranking. Unknown IDs are ignored.
 */
const FEATURED = [
  "gpt-6-astra", "claude-opus-5-5", "gemini-3-8-flash", "claude-sonnet-5-5", "gpt-6-1-sol",
  "grok-4-7", "deepseek-v4-pro", "gemini-3-1-pro-preview", "qwen3-8-max", "llama-4-maverick",
  "mistral-medium-3-5", "kimi-k2", "glm-5", "gpt-oss-120b", "deepseek-v4-1-flash",
];

const changelog: ChangelogEntry[] = [
  {
    id: "catalog-v2", date: CHECKED, kind: "data",
    title: "Expanded catalog with categories, benchmarks, and provenance",
    description: "Re-verified the reference catalog against official provider documentation, added model categories, cached-input and non-token pricing, structured benchmark results with reporter labels, and lifecycle status (active, preview, deprecated, retired).",
  },
  {
    id: "platform-v2", date: CHECKED, kind: "product",
    title: "New comparison, pricing calculator, release feed, and benchmark explorer",
    description: "Comparisons gained sticky headers, difference filtering, and an API cost calculator. New pages: releases, benchmarks, pricing calculator, provider timelines, favorites, and methodology updates.",
  },
  {
    id: "launch", date: "2026-09-30", kind: "product",
    title: "AI Compare launched",
    description: "First public version with source-linked model profiles, comparisons, company pages, and an AI finder.",
  },
];

/** Local logo files (see public/logos/NOTICE.txt) for providers that did not set one. */
const LOCAL_LOGOS = new Set([
  "openai", "anthropic", "google", "xai", "deepseek", "meta", "mistral", "qwen", "microsoft", "perplexity",
  "cohere", "black-forest-labs", "runway", "bytedance", "moonshot", "zai", "minimax", "baidu", "tencent",
  "huawei", "stability-ai", "midjourney", "elevenlabs", "suno", "kuaishou", "ideogram", "recraft", "together",
  "groq", "cerebras", "fireworks", "openrouter", "nvidia", "amazon", "ai21",
]);

export function buildCatalog(files: ProviderFile[]): Catalog {
  const providers = files.flatMap((file) => file.providers.map((input) => buildProvider({
    ...input,
    logo: input.logo || (LOCAL_LOGOS.has(input.id) ? `/logos/${input.id}.svg` : ""),
  })));
  const inputs = files.flatMap((file) => file.models);
  const featuredRank = new Map(FEATURED.map((id, index) => [id, index + 1]));
  const ordered = [...inputs].sort((a, b) => {
    const rankA = featuredRank.get(a.id) ?? Infinity;
    const rankB = featuredRank.get(b.id) ?? Infinity;
    if (rankA !== rankB) return rankA - rankB;
    const statusOrder = { active: 0, preview: 1, deprecated: 2, retired: 3 } as const;
    if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
    const dateA = typeof a.released === "string" ? a.released : a.released?.v ?? "";
    const dateB = typeof b.released === "string" ? b.released : b.released?.v ?? "";
    return dateB.localeCompare(dateA) || a.name.localeCompare(b.name);
  });
  const models = ordered.map((input, index) => buildModel(input, index + 1));
  const benchmarkMap = new Map(benchmarkDefinitions.map((definition) => [definition.id, definition]));
  for (const file of files) for (const extra of file.extraBenchmarks ?? []) if (!benchmarkMap.has(extra.id)) benchmarkMap.set(extra.id, extra);

  return {
    schemaVersion: 2,
    providers: providers.sort((a, b) => a.name.localeCompare(b.name)),
    models,
    benchmarks: [...benchmarkMap.values()],
    links: [],
    sponsored: [],
    changelog,
    updatedAt: `${CHECKED}T08:00:00.000Z`,
  };
}

export const seedCatalog: Catalog = buildCatalog(providerFiles);
