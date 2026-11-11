/**
 * Automatic model discovery. Pure planning logic: given the current catalog and
 * snapshots of public model listings, decide which models to add and which
 * prices changed. No I/O happens here except in fetchModelSources().
 *
 * Rules that keep the catalog trustworthy:
 * - Only providers already in the catalog are synced; nothing is invented.
 * - Every imported fact cites the listing it came from; missing facts stay unknown.
 * - Existing models are never rewritten, except a price change that two
 *   independent listings agree on.
 */
import { buildModel, type ModelInput, type V } from "../data/define";
import { catalogSchema, modelSchema } from "./catalog-schema";
import type { AIModel, Catalog, ChangelogEntry, ModelCategory, ModelRelease, Source, UseCase } from "./types";

export interface OpenRouterModel {
  id: string;
  canonical_slug?: string | null;
  hugging_face_id?: string | null;
  name: string;
  created: number;
  description?: string | null;
  context_length?: number | null;
  architecture?: { input_modalities?: string[] | null; output_modalities?: string[] | null } | null;
  pricing?: { prompt?: string | null; completion?: string | null; input_cache_read?: string | null } | null;
  top_provider?: { max_completion_tokens?: number | null } | null;
  supported_parameters?: string[] | null;
  knowledge_cutoff?: string | null;
}

export interface ModelsDevModel {
  id: string;
  name?: string;
  description?: string;
  release_date?: string;
  knowledge?: string;
  open_weights?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  modalities?: { input?: string[]; output?: string[] };
  limit?: { context?: number; output?: number };
  cost?: { input?: number; output?: number; cache_read?: number };
  canonical_model_id?: string;
}

export type ModelsDevApi = Record<string, { models?: Record<string, ModelsDevModel> } | undefined>;

export interface ModelSources {
  openRouter: OpenRouterModel[];
  modelsDev: ModelsDevApi;
}

/** OpenRouter author prefix → catalog provider ID. Hosting platforms are excluded on purpose. */
export const OPENROUTER_PROVIDERS: Record<string, string> = {
  openai: "openai", anthropic: "anthropic", google: "google", meta: "meta", "meta-llama": "meta",
  "x-ai": "xai", mistralai: "mistral", deepseek: "deepseek", qwen: "qwen", amazon: "amazon",
  baidu: "baidu", bytedance: "bytedance", "bytedance-seed": "bytedance", cohere: "cohere",
  microsoft: "microsoft", minimax: "minimax", moonshotai: "moonshot", nvidia: "nvidia",
  perplexity: "perplexity", tencent: "tencent", "z-ai": "zai", ai21: "ai21",
};

/** models.dev first-party provider key → catalog provider ID (official API prices only). */
export const MODELS_DEV_PROVIDERS: Record<string, string> = {
  openai: "openai", anthropic: "anthropic", google: "google", xai: "xai", mistral: "mistral",
  deepseek: "deepseek", cohere: "cohere", zai: "zai", minimax: "minimax", moonshotai: "moonshot",
  perplexity: "perplexity", meta: "meta", alibaba: "qwen", ai21: "ai21",
};

/** Authors used in models.dev canonical IDs that differ from its provider keys. */
const CANONICAL_AUTHORS: Record<string, string> = { ...MODELS_DEV_PROVIDERS, ...OPENROUTER_PROVIDERS, zhipuai: "zai" };

/**
 * Model family prefixes that unambiguously belong to one lab. models.dev provider
 * lists also contain models a provider merely hosts, so those must not be re-attributed.
 */
const OWNED_PREFIXES: [RegExp, string][] = [
  [/^(gpt|o\d|chatgpt|dall-e|sora|whisper|tts|codex)(-|$)/, "openai"],
  [/^claude(-|$)/, "anthropic"],
  [/^(gemini|gemma|imagen|veo|lyria)(-|$)/, "google"],
  [/^grok(-|$)/, "xai"],
  [/^deepseek(-|$)/, "deepseek"],
  [/^(glm|chatglm|cogview)(-|$)/, "zai"],
  [/^(kimi|moonshot)(-|$)/, "moonshot"],
  [/^(qwen|qwq|qvq)/, "qwen"],
  [/^(llama|muse)(-|$)/, "meta"],
  [/^(mistral|ministral|codestral|devstral|magistral|pixtral|voxtral)(-|$)/, "mistral"],
  [/^minimax(-|$)/, "minimax"],
  [/^(command|embed|rerank|aya)(-|$)/, "cohere"],
  [/^(nemotron|llama-\d+-nemotron)/, "nvidia"],
  [/^ernie(-|$)/, "baidu"],
  [/^hunyuan(-|$)/, "tencent"],
  [/^nova(-|$)/, "amazon"],
  [/^phi(-|$)/, "microsoft"],
  [/^sonar(-|$)/, "perplexity"],
  [/^jamba(-|$)/, "ai21"],
  [/^(doubao|seed)(-|$)/, "bytedance"],
];

function belongsTo(model: ModelsDevModel, providerId: string, key: string) {
  const author = model.canonical_model_id?.split("/")[0];
  if (author) return CANONICAL_AUTHORS[author] === providerId;
  const owner = OWNED_PREFIXES.find(([pattern]) => pattern.test(key))?.[1];
  return !owner || owner === providerId;
}

export const SYNC_EDITOR = "model-sync";
export const AUTO_TAG = "Auto-imported";

export interface SyncOptions {
  now: Date;
  /** Only releases this recent are imported, so old back-catalog entries never flood in. */
  windowDays?: number;
  /** Safety cap per run in case a source misbehaves. */
  maxNew?: number;
}

export interface PriceChange {
  modelId: string;
  name: string;
  input: [number | null, number];
  output: [number | null, number];
}

export interface SyncPlan {
  added: AIModel[];
  priceChanges: PriceChange[];
  skipped: number;
  catalog: Catalog;
}

const DAY = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CUTOFF = /^\d{4}(-(0[1-9]|1[0-2])(-\d{2})?)?$/;

/** Collapses API IDs, names, and dated snapshots to one comparable key. */
export function modelKey(raw: string) {
  return raw
    .toLowerCase()
    .replace(/^[^/]*\//, "")
    .replace(/:.*$/, "")
    .replace(/[._\s/]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-(20\d{6}|20\d{2}-\d{2}-\d{2}|\d{2}-20\d{2}|latest)$/, "");
}

const looseKey = (key: string) => key.replace(/-(preview|exp|experimental|beta)$/, "").replace(/-\d{4}$/, "");

function perMillion(value: string | number | null | undefined) {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (parsed === undefined || parsed === null || !Number.isFinite(parsed) || parsed <= 0) return null;
  const amount = typeof value === "string" ? parsed * 1_000_000 : parsed;
  return Math.round(amount * 1_000_000) / 1_000_000;
}

const samePrice = (a: number, b: number) => Math.abs(a - b) <= Math.max(a, b) * 0.005;

function cleanName(name: string) {
  return name.replace(/^[^:]{1,40}:\s*/, "").replace(/\s*\((free|beta)\)\s*$/i, "").trim();
}

function describe(text: string | null | undefined) {
  if (!text) return null;
  const sentences = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length > 1 && !sentence.endsWith("...") && !sentence.endsWith("…"));
  const picked: string[] = [];
  for (const sentence of sentences) {
    if (picked.length === 3 || [...picked, sentence].join(" ").length > 600) break;
    picked.push(sentence);
  }
  return picked.length ? picked.join(" ") : null;
}

function familyFor(name: string, providerFamilies: string[]) {
  const key = modelKey(name);
  const known = providerFamilies
    .filter((family) => key === modelKey(family) || key.startsWith(`${modelKey(family)}-`))
    .sort((a, b) => b.length - a.length)[0];
  if (known) return known;
  const tokens = name.split(/\s+/);
  const versioned = tokens.findIndex((token) => /\d/.test(token));
  if (versioned === -1) return tokens[0];
  const major = tokens[versioned].match(/\d+/)?.[0] ?? tokens[versioned];
  return [...tokens.slice(0, versioned), tokens[versioned].replace(/\d+(\.\d+)*/, major)].join(" ");
}

interface Candidate {
  providerId: string;
  key: string;
  or?: OpenRouterModel;
  md?: ModelsDevModel;
}

function collect(sources: ModelSources) {
  const candidates = new Map<string, Candidate>();
  const upsert = (providerId: string, key: string, patch: Partial<Candidate>) => {
    const id = `${providerId}:${key}`;
    const existing = candidates.get(id);
    candidates.set(id, { providerId, key, ...existing, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v)) });
  };
  for (const model of sources.openRouter) {
    const [author, rest] = model.id.split("/");
    const providerId = OPENROUTER_PROVIDERS[author];
    if (!providerId || !rest || rest.includes(":") || /latest/.test(rest)) continue;
    const key = modelKey(model.id);
    if (key) upsert(providerId, key, { or: model });
  }
  for (const [providerKey, providerId] of Object.entries(MODELS_DEV_PROVIDERS)) {
    for (const model of Object.values(sources.modelsDev[providerKey]?.models ?? {})) {
      if (!model?.id || /latest/.test(model.id)) continue;
      const key = modelKey(model.id);
      if (key && belongsTo(model, providerId, key)) upsert(providerId, key, { md: model });
    }
  }
  // The same model often appears under different IDs in each listing (e.g. "muse-ember"
  // and "muse-ember-1-0"). Merge entries that share a provider and display name.
  const byName = new Map<string, Candidate>();
  for (const candidate of [...candidates.values()].sort((a, b) => Number(Boolean(b.or)) - Number(Boolean(a.or)))) {
    const id = `${candidate.providerId}:${nameKey(candidate)}`;
    const first = byName.get(id);
    if (!first) byName.set(id, candidate);
    else {
      first.or ??= candidate.or;
      first.md ??= candidate.md;
    }
  }
  return [...byName.values()];
}

function nameKey(candidate: Candidate) {
  return modelKey(cleanName(candidate.or?.name ?? candidate.md?.name ?? candidate.key));
}

function releaseDate(candidate: Candidate) {
  if (candidate.md?.release_date && DATE.test(candidate.md.release_date)) return candidate.md.release_date;
  if (candidate.or?.created) return new Date(candidate.or.created * 1000).toISOString().slice(0, 10);
  return null;
}

function toInput(candidate: Candidate, catalog: Catalog, today: string): ModelInput {
  const { or, md } = candidate;
  const provider = catalog.providers.find((entry) => entry.id === candidate.providerId)!;
  const orSource: Source | null = or
    ? { label: "OpenRouter model listing", url: `https://openrouter.ai/${or.id}`, checkedAt: today }
    : null;
  const mdSource: Source = { label: "models.dev open model database", url: "https://models.dev/", checkedAt: today };
  const primary = orSource ?? mdSource;
  const cite = <T>(value: T | null | undefined, source: Source): V<T> | undefined =>
    value === null || value === undefined ? undefined : { v: value, s: source };
  const pick = <T>(mdValue: T | null | undefined, orValue: T | null | undefined) =>
    mdValue !== null && mdValue !== undefined ? cite(mdValue, mdSource) : orSource ? cite(orValue, orSource) : undefined;

  const name = cleanName(or?.name ?? md?.name ?? candidate.key);
  const inputs = md?.modalities?.input ?? or?.architecture?.input_modalities ?? null;
  const outputs = md?.modalities?.output ?? or?.architecture?.output_modalities ?? null;
  const modalitySource = md?.modalities ? mdSource : primary;
  const params = new Set(or?.supported_parameters ?? []);
  const flag = (orHas: boolean, mdValue: boolean | undefined): V<boolean> | undefined =>
    orHas && orSource ? { v: true, s: orSource } : mdValue === undefined ? undefined : { v: mdValue, s: mdSource };

  const tools = flag(params.has("tools"), md?.tool_call);
  const structured = flag(params.has("structured_outputs") || params.has("response_format"), md?.structured_output);
  const reasoning = flag(params.has("reasoning") || params.has("include_reasoning"), md?.reasoning);
  const has = (list: string[] | null, kind: string): V<boolean> | undefined =>
    list ? { v: list.includes(kind), s: modalitySource } : undefined;

  const imageOut = outputs?.includes("image") ?? false;
  const textOut = outputs?.includes("text") ?? true;
  const isTrue = (value: V<boolean> | undefined) => typeof value === "object" && value?.v === true;
  const embedding = /embed/.test(candidate.key);
  const coding = /(^|-)(code|coder|codex|codestral|devstral)(-|$)/.test(candidate.key);

  const categories: ModelCategory[] = embedding
    ? ["embeddings"]
    : imageOut
      ? ["image-generation", ...(inputs?.includes("image") ? (["image-editing"] as const) : [])]
      : outputs?.includes("video")
        ? ["video-generation"]
        : !textOut && outputs?.includes("audio")
          ? ["text-to-speech"]
          : [coding ? "coding" : "general"];
  if (!embedding && textOut && isTrue(reasoning)) categories.push("reasoning");
  if (!embedding && textOut && (inputs?.includes("image") || inputs?.includes("audio") || inputs?.includes("video"))) categories.push("multimodal");

  const context = md?.limit?.context || or?.context_length || null;
  const bestFor = new Set<UseCase>();
  if (categories.includes("coding")) bestFor.add("coding");
  if (categories.includes("general")) bestFor.add("general");
  if (categories.includes("reasoning")) bestFor.add("research");
  if (categories.includes("image-generation")) bestFor.add("image-creation");
  if (inputs?.includes("image") && textOut) bestFor.add("vision");
  if (context && context >= 500_000) bestFor.add("long-context");

  const cutoff = [md?.knowledge, or?.knowledge_cutoff].find((value) => value && CUTOFF.test(value));
  const openWeights = md?.open_weights ?? (or?.hugging_face_id ? true : undefined);
  const mdPrice = { input: perMillion(md?.cost?.input), output: perMillion(md?.cost?.output), cached: perMillion(md?.cost?.cache_read) };
  const orPrice = { input: perMillion(or?.pricing?.prompt), output: perMillion(or?.pricing?.completion), cached: perMillion(or?.pricing?.input_cache_read) };
  const family = familyFor(name, [...new Set(catalog.models.filter((model) => model.providerId === candidate.providerId).map((model) => model.family))]);
  const released = releaseDate(candidate)!;

  return {
    id: candidate.key,
    name,
    provider: candidate.providerId,
    family,
    version: or ? or.id.split("/")[1] : md!.id,
    categories,
    status: /(^|-)(preview|exp|experimental|beta)(-|$)/.test(candidate.key) ? "preview" : "active",
    description:
      describe(or?.description) ??
      describe(md?.description) ??
      `${name} is a ${provider.name} model that appeared in public model listings on ${released}.`,
    source: primary,
    released: { v: released, s: md?.release_date ? mdSource : primary },
    cutoff: cutoff ? { v: cutoff, s: md?.knowledge === cutoff ? mdSource : primary } : undefined,
    context: context ? { v: context, s: md?.limit?.context ? mdSource : primary } : undefined,
    maxOutput: pick(md?.limit?.output || null, or?.top_provider?.max_completion_tokens || null),
    openness: openWeights === undefined ? undefined : { v: openWeights ? "open-weights" : "proprietary", s: md?.open_weights !== undefined ? mdSource : primary },
    api: { v: true, s: primary },
    price: {
      input: pick(mdPrice.input, orPrice.input),
      cachedInput: pick(mdPrice.cached, orPrice.cached),
      output: pick(mdPrice.output, orPrice.output),
      note: "Standard API rate as listed when the model was imported; check the provider for tiered or regional pricing.",
    },
    caps: {
      text: inputs || outputs ? { v: Boolean(inputs?.includes("text") || textOut), s: modalitySource } : undefined,
      imageInput: has(inputs, "image"),
      audioInput: has(inputs, "audio"),
      videoInput: has(inputs, "video"),
      imageOutput: has(outputs, "image"),
      audioOutput: has(outputs, "audio"),
      videoOutput: has(outputs, "video"),
      embeddings: embedding ? { v: true, s: primary } : undefined,
      toolCalling: tools,
      structuredOutputs: structured,
      reasoning,
      coding: coding ? { v: true, s: primary } : undefined,
    },
    website: provider.website,
    apiDocs: orSource?.url ?? null,
    bestFor: [...bestFor],
    tags: [AUTO_TAG, family].filter((tag, index, all) => all.indexOf(tag) === index),
  };
}

function corroboratedPrice(candidate: Candidate) {
  const pairs = (["input", "output"] as const).map((field) => {
    const md = perMillion(candidate.md?.cost?.[field]);
    const or = perMillion(candidate.or?.pricing?.[field === "input" ? "prompt" : "completion"]);
    return md !== null && or !== null && samePrice(md, or) ? md : null;
  });
  return pairs[0] !== null && pairs[1] !== null ? { input: pairs[0], output: pairs[1] } : null;
}

function formatPrice(value: number | null) {
  return value === null ? "unlisted" : `$${value}`;
}

export function planModelSync(catalog: Catalog, sources: ModelSources, options: SyncOptions): SyncPlan {
  const nowIso = options.now.toISOString();
  const today = nowIso.slice(0, 10);
  const earliest = new Date(options.now.getTime() - (options.windowDays ?? 30) * DAY).toISOString().slice(0, 10);
  const providerIds = new Set(catalog.providers.map((provider) => provider.id));
  const takenIds = new Set(catalog.models.map((model) => model.id));

  const known = new Map<string, AIModel>();
  for (const model of catalog.models) {
    for (const raw of [model.id, model.slug, model.version, model.name]) {
      const key = modelKey(raw);
      if (!key) continue;
      known.set(`${model.providerId}:${key}`, model);
      known.set(`${model.providerId}:${looseKey(key)}`, model);
    }
  }
  const find = (candidate: Candidate) => {
    for (const key of [candidate.key, nameKey(candidate)]) {
      const match = known.get(`${candidate.providerId}:${key}`) ?? known.get(`${candidate.providerId}:${looseKey(key)}`);
      if (match) return match;
    }
    return undefined;
  };

  const candidates = collect(sources).filter((candidate) => providerIds.has(candidate.providerId));
  let skipped = 0;
  const fresh: Candidate[] = [];
  const priceChanges: PriceChange[] = [];
  const updated = new Map<string, AIModel>();

  for (const candidate of candidates) {
    const existing = find(candidate);
    if (existing) {
      const price = corroboratedPrice(candidate);
      if (!price || existing.id !== candidate.key) continue;
      const current = { input: existing.pricing.input.value, output: existing.pricing.output.value };
      const differs = (["input", "output"] as const).some((field) => current[field] === null || !samePrice(current[field]!, price[field]));
      if (!differs) continue;
      const source: Source = { label: "models.dev open model database (matches OpenRouter listing)", url: "https://models.dev/", checkedAt: today };
      const fact = (value: number) => ({ value, source, updatedAt: today, note: "Standard API rate; confirmed by two independent public listings." });
      const wasKnown = current.input !== null && current.output !== null;
      const event: ModelRelease[] = wasKnown
        ? [{
            id: `${existing.id}-pricing-${today}`,
            date: today,
            type: "pricing",
            title: `${existing.name} price change`,
            description: `Input ${formatPrice(current.input)} → $${price.input} and output ${formatPrice(current.output)} → $${price.output} per 1M tokens.`,
            source,
          }]
        : [];
      if (event.length && existing.releases.some((release) => release.id === event[0].id)) continue;
      updated.set(existing.id, {
        ...existing,
        pricing: { ...existing.pricing, input: fact(price.input), output: fact(price.output) },
        releases: [...event, ...existing.releases].sort((a, b) => b.date.localeCompare(a.date)),
        updatedAt: nowIso,
        updatedBy: SYNC_EDITOR,
      });
      priceChanges.push({ modelId: existing.id, name: existing.name, input: [current.input, price.input], output: [current.output, price.output] });
      continue;
    }
    const released = releaseDate(candidate);
    if (!released || released < earliest || released > today) continue;
    if (takenIds.has(candidate.key) || candidate.key.includes("-vs-") || candidate.key.length > 160) {
      skipped += 1;
      continue;
    }
    takenIds.add(candidate.key);
    fresh.push(candidate);
  }

  fresh.sort((a, b) => releaseDate(b)!.localeCompare(releaseDate(a)!) || a.key.localeCompare(b.key));
  if (fresh.length > (options.maxNew ?? 25)) skipped += fresh.length - (options.maxNew ?? 25);

  const nextRank = Math.max(0, ...catalog.models.map((model) => model.editorial.rank)) + 1;
  const added: AIModel[] = [];
  for (const candidate of fresh.slice(0, options.maxNew ?? 25)) {
    const built = buildModel(toInput(candidate, catalog, today), nextRank + added.length);
    const model: AIModel = {
      ...built,
      editorial: {
        ...built.editorial,
        rationale: "Added automatically by the daily model sync from public model listings. Facts cite those listings until editorially reviewed.",
        updatedAt: nowIso,
      },
      addedAt: nowIso,
      updatedAt: nowIso,
      updatedBy: SYNC_EDITOR,
    };
    const valid = modelSchema.safeParse(model);
    if (!valid.success) {
      skipped += 1;
      continue;
    }
    added.push(valid.data);
  }

  if (!added.length && !priceChanges.length) return { added, priceChanges, skipped, catalog };

  const summary = [
    added.length ? `Added ${added.map((model) => model.name).join(", ")}.` : "",
    priceChanges.length ? `Updated prices for ${priceChanges.map((change) => change.name).join(", ")}.` : "",
  ].filter(Boolean).join(" ");
  let changelogId = `model-sync-${today}`;
  for (let suffix = 2; catalog.changelog.some((entry) => entry.id === changelogId); suffix += 1) changelogId = `model-sync-${today}-${suffix}`;
  const entry: ChangelogEntry = {
    id: changelogId,
    date: today,
    kind: "data",
    title: added.length
      ? `${added.length} new model${added.length === 1 ? "" : "s"} added automatically`
      : `Prices updated for ${priceChanges.length} model${priceChanges.length === 1 ? "" : "s"}`,
    description: summary.length > 2000 ? `${summary.slice(0, 1997)}...` : summary,
  };

  const next = catalogSchema.parse({
    ...catalog,
    models: [...catalog.models.map((model) => updated.get(model.id) ?? model), ...added],
    changelog: [entry, ...catalog.changelog],
    updatedBy: SYNC_EDITOR,
  });
  return { added, priceChanges, skipped, catalog: next };
}

export async function fetchModelSources(fetcher: typeof fetch = fetch): Promise<ModelSources> {
  const get = async (url: string) => {
    const response = await fetcher(url, { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`${url} responded with ${response.status}`);
    return response.json() as Promise<unknown>;
  };
  const [openRouter, modelsDev] = await Promise.all([
    get("https://openrouter.ai/api/v1/models"),
    get("https://models.dev/api.json"),
  ]);
  const list = (openRouter as { data?: unknown }).data;
  if (!Array.isArray(list) || !list.length || typeof modelsDev !== "object" || modelsDev === null) {
    throw new Error("A model listing returned an unexpected shape.");
  }
  return { openRouter: list as OpenRouterModel[], modelsDev: modelsDev as ModelsDevApi };
}
