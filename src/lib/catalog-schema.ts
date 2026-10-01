import { z } from "zod";

import {
  BENCHMARK_CATEGORIES,
  CAPABILITIES,
  EVENT_TYPES,
  MODEL_CATEGORIES,
  MODEL_STATUSES,
  SPONSOR_SLOTS,
  USE_CASES,
  type AIModel,
  type Catalog,
  type Provider,
} from "./types";

const text = (max: number) =>
  z.string().min(1).max(max).refine((value) => value.trim().length > 0, "Must not be blank");

export const httpUrlSchema = z
  .string()
  .max(2048)
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        (url.protocol === "https:" || url.protocol === "http:") &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Use an http:// or https:// URL without embedded credentials");

export const dateSchema = z.iso.date();
export const timestampSchema = z.union([dateSchema, z.iso.datetime({ offset: true })]);

// Publishers sometimes specify only a year or month; do not invent a day.
export const knowledgeCutoffSchema = z.union([
  dateSchema,
  z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM or YYYY-MM-DD"),
  z.string().regex(/^\d{4}$/, "Use a calendar year"),
]);

export const idSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, "Use a lowercase alphanumeric ID");

export const slugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase kebab-case slug")
  .refine((value) => !value.includes("-vs-"), "Slugs must not contain -vs- (reserved for comparison URLs)");

export const logoSchema = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      (value === value.trim() &&
        /^\/logos\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.(svg|png|webp)$/.test(value)),
    "Leave empty for a monogram or use a local /logos/ image, not an external URL",
  );

export const sourceSchema = z.strictObject({
  label: text(300),
  url: httpUrlSchema,
  checkedAt: timestampSchema,
});

export function factSchema<T extends z.ZodType>(valueSchema: T) {
  return z
    .strictObject({
      value: valueSchema.nullable(),
      source: sourceSchema.nullable(),
      updatedAt: timestampSchema,
      note: text(3000).optional(),
    })
    .superRefine((fact, context) => {
      if ("value" in fact && fact.value !== null && fact.source === null) {
        context.addIssue({
          code: "custom",
          path: ["source"],
          message: "A known fact requires a source; use value: null for unknown facts",
        });
      }
    });
}

const nonnegativeNumber = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER);
const tokenCount = nonnegativeNumber.int();

export const categorySchema = z.enum(MODEL_CATEGORIES);
export const statusSchema = z.enum(MODEL_STATUSES);
export const useCaseSchema = z.enum(USE_CASES);
export const opennessSchema = z.enum(["proprietary", "open-weights", "open-source"]);

export const productSchema = z.strictObject({
  name: text(160),
  description: text(2000),
  url: httpUrlSchema,
});

export const providerSchema = z.strictObject({
  id: idSchema,
  slug: slugSchema,
  name: text(160),
  kind: z.enum(["lab", "platform"]),
  description: text(5000),
  website: httpUrlSchema,
  country: text(100).nullable(),
  founded: z.number().int().min(1800).max(new Date().getUTCFullYear()).nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color"),
  logo: logoSchema,
  products: z.array(productSchema).max(100),
  sources: z.array(sourceSchema).min(1).max(100),
  updatedAt: timestampSchema,
  updatedBy: text(120).optional(),
}) satisfies z.ZodType<Provider>;

export const benchmarkDefinitionSchema = z.strictObject({
  id: idSchema,
  name: text(200),
  description: text(2000),
  category: z.enum(BENCHMARK_CATEGORIES),
  unit: z.enum(["%", "elo", "score"]),
  higherIsBetter: z.boolean(),
  url: httpUrlSchema,
});

export const benchmarkResultSchema = z.strictObject({
  id: idSchema,
  benchmarkId: idSchema,
  score: z.number().finite(),
  display: text(60).optional(),
  version: text(200).nullable(),
  evaluatedAt: dateSchema,
  conditions: text(1000).nullable(),
  reportedBy: z.enum(["provider", "independent"]),
  source: sourceSchema,
});

export const modelReleaseSchema = z.strictObject({
  id: idSchema,
  date: dateSchema,
  title: text(250),
  description: text(4000),
  type: z.enum(EVENT_TYPES),
  source: sourceSchema,
});

export const capabilitiesSchema = z.record(z.enum(CAPABILITIES), factSchema(z.boolean()));

export const pricingSchema = z.strictObject({
  input: factSchema(nonnegativeNumber),
  cachedInput: factSchema(nonnegativeNumber),
  output: factSchema(nonnegativeNumber),
  other: factSchema(text(600)),
  subscription: factSchema(nonnegativeNumber),
  currency: z.literal("USD"),
  unit: z.literal("1M tokens"),
});

export const editorialSchema = z
  .strictObject({
    rank: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    trending: z.boolean(),
    rationale: text(3000),
    trendSource: sourceSchema.nullable(),
    updatedAt: timestampSchema,
  })
  .superRefine((editorial, context) => {
    if (editorial.trending && editorial.trendSource === null) {
      context.addIssue({
        code: "custom",
        path: ["trendSource"],
        message: "A trending model needs a citable trend source; popularity is never invented",
      });
    }
  });

function uniqueStrings(values: string[]) {
  return new Set(values.map((value) => value.toLowerCase())).size === values.length;
}

export const modelSchema = z
  .strictObject({
    id: idSchema,
    slug: slugSchema,
    name: text(200),
    providerId: idSchema,
    family: text(120),
    description: text(5000),
    version: text(200),
    categories: z.array(categorySchema).min(1).max(8).refine(uniqueStrings, "Categories must be unique"),
    status: statusSchema,
    releaseDate: factSchema(dateSchema),
    knowledgeCutoff: factSchema(knowledgeCutoffSchema),
    contextWindow: factSchema(tokenCount),
    maxOutput: factSchema(tokenCount),
    openness: factSchema(opennessSchema),
    license: factSchema(text(300)),
    apiAvailable: factSchema(z.boolean()),
    freeAccess: factSchema(z.boolean()),
    languages: factSchema(text(600)),
    speed: factSchema(z.enum(["fast", "balanced", "thorough"])),
    capabilities: capabilitiesSchema,
    pricing: pricingSchema,
    website: httpUrlSchema,
    apiDocs: httpUrlSchema.nullable(),
    bestFor: z.array(useCaseSchema).refine(uniqueStrings, "Use cases must be unique"),
    tags: z.array(text(100)).max(30).refine(uniqueStrings, "Tags must be unique"),
    benchmarks: z.array(benchmarkResultSchema).max(300),
    releases: z.array(modelReleaseSchema).max(500),
    editorial: editorialSchema,
    addedAt: timestampSchema,
    updatedAt: timestampSchema,
    updatedBy: text(120).optional(),
  })
  .superRefine((model, context) => {
    for (const field of ["benchmarks", "releases"] as const) {
      const seen = new Set<string>();
      model[field].forEach((record, index) => {
        if (seen.has(record.id)) {
          context.addIssue({
            code: "custom",
            path: [field, index, "id"],
            message: `Duplicate ${field} ID within this model`,
          });
        }
        seen.add(record.id);
      });
    }
  }) satisfies z.ZodType<AIModel>;

export const aiModelSchema = modelSchema;

export const outboundLinkSchema = z.strictObject({
  id: idSchema,
  targetType: z.enum(["model", "provider"]),
  targetId: idSchema,
  label: text(120),
  destinationUrl: httpUrlSchema,
  affiliateUrl: httpUrlSchema.nullable(),
  utmCampaign: z.string().max(120).regex(/^[a-zA-Z0-9_.-]+$/, "Use letters, numbers, dots, dashes, or underscores").nullable(),
  isAffiliate: z.boolean(),
  enabled: z.boolean(),
  updatedAt: timestampSchema,
});

export const sponsoredPlacementSchema = z.strictObject({
  id: idSchema,
  slot: z.enum(SPONSOR_SLOTS),
  sponsor: text(160),
  title: text(160),
  description: text(400),
  url: httpUrlSchema,
  providerId: idSchema.nullable(),
  modelId: idSchema.nullable(),
  enabled: z.boolean(),
  startsAt: timestampSchema,
  endsAt: timestampSchema.nullable(),
  updatedAt: timestampSchema,
});

export const changelogEntrySchema = z.strictObject({
  id: idSchema,
  date: dateSchema,
  kind: z.enum(["data", "product"]),
  title: text(200),
  description: text(2000),
});

export const catalogSchema = z
  .strictObject({
    schemaVersion: z.literal(2),
    providers: z.array(providerSchema).max(1000),
    models: z.array(modelSchema).max(10000),
    benchmarks: z.array(benchmarkDefinitionSchema).max(1000),
    links: z.array(outboundLinkSchema).max(20000),
    sponsored: z.array(sponsoredPlacementSchema).max(500),
    changelog: z.array(changelogEntrySchema).max(5000),
    updatedAt: timestampSchema,
    updatedBy: text(120).optional(),
  })
  .superRefine((catalog, context) => {
    const unique = (collection: "providers" | "models" | "benchmarks" | "links" | "sponsored" | "changelog", field: string) => {
      const seen = new Set<string>();
      (catalog[collection] as unknown as Record<string, string>[]).forEach((record, index) => {
        if (seen.has(record[field])) {
          context.addIssue({ code: "custom", path: [collection, index, field], message: `Duplicate ${collection} ${field}` });
        }
        seen.add(record[field]);
      });
    };
    unique("providers", "id");
    unique("providers", "slug");
    unique("models", "id");
    unique("models", "slug");
    unique("benchmarks", "id");
    unique("links", "id");
    unique("sponsored", "id");
    unique("changelog", "id");

    const providerIds = new Set(catalog.providers.map((provider) => provider.id));
    const modelIds = new Set(catalog.models.map((model) => model.id));
    const benchmarkIds = new Set(catalog.benchmarks.map((benchmark) => benchmark.id));
    catalog.models.forEach((model, index) => {
      if (!providerIds.has(model.providerId)) {
        context.addIssue({ code: "custom", path: ["models", index, "providerId"], message: "The model must reference an existing provider" });
      }
      model.benchmarks.forEach((result, resultIndex) => {
        if (!benchmarkIds.has(result.benchmarkId)) {
          context.addIssue({ code: "custom", path: ["models", index, "benchmarks", resultIndex, "benchmarkId"], message: "Unknown benchmark definition" });
        }
      });
    });
    catalog.links.forEach((link, index) => {
      const exists = link.targetType === "model" ? modelIds.has(link.targetId) : providerIds.has(link.targetId);
      if (!exists) context.addIssue({ code: "custom", path: ["links", index, "targetId"], message: `Unknown ${link.targetType}` });
      if (link.isAffiliate && !link.affiliateUrl) {
        context.addIssue({ code: "custom", path: ["links", index, "affiliateUrl"], message: "An affiliate link needs an affiliate URL" });
      }
    });
    catalog.sponsored.forEach((placement, index) => {
      if (placement.providerId && !providerIds.has(placement.providerId)) {
        context.addIssue({ code: "custom", path: ["sponsored", index, "providerId"], message: "Unknown provider" });
      }
      if (placement.modelId && !modelIds.has(placement.modelId)) {
        context.addIssue({ code: "custom", path: ["sponsored", index, "modelId"], message: "Unknown model" });
      }
    });
  }) satisfies z.ZodType<Catalog>;

/* ------------------------------------------------------------------------- */
/* Migration of v1 snapshots (single `type`, `available` status, string scores) */
/* ------------------------------------------------------------------------- */

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose => typeof value === "object" && value !== null && !Array.isArray(value);

const v1TypeToCategory: Record<string, string> = {
  general: "general",
  reasoning: "reasoning",
  coding: "coding",
  image: "image-generation",
  video: "video-generation",
  speech: "text-to-speech",
  embedding: "embeddings",
  research: "search",
};

function unknownFact(updatedAt: string) {
  return { value: null, source: null, updatedAt, note: "Not publicly disclosed in the checked official sources." };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "benchmark";
}

/** Upgrades a stored v1 catalog in memory. v2 input is returned unchanged. */
export function migrateCatalog(raw: unknown): unknown {
  if (!isObject(raw) || raw.schemaVersion === 2) return raw;
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString();
  const definitions = new Map<string, Loose>();

  const providers = Array.isArray(raw.providers)
    ? raw.providers.map((provider) => (isObject(provider) ? { kind: "lab", ...provider } : provider))
    : raw.providers;

  const models = Array.isArray(raw.models)
    ? raw.models.map((model) => {
        if (!isObject(model)) return model;
        const { type, ...rest } = model;
        const capabilities = isObject(model.capabilities) ? { ...model.capabilities } : {};
        for (const key of CAPABILITIES) if (!(key in capabilities)) capabilities[key] = unknownFact(updatedAt);
        const pricing = isObject(model.pricing) ? model.pricing : {};
        const editorial = isObject(model.editorial) ? model.editorial : {};
        const benchmarks = Array.isArray(model.benchmarks)
          ? model.benchmarks.flatMap((entry) => {
              if (!isObject(entry) || typeof entry.name !== "string") return [];
              const score = Number.parseFloat(String(entry.score).replace(/[^0-9.-]/g, ""));
              if (!Number.isFinite(score)) return [];
              const benchmarkId = slugify(entry.name);
              if (!definitions.has(benchmarkId)) {
                definitions.set(benchmarkId, {
                  id: benchmarkId, name: entry.name, category: "reasoning", unit: "score", higherIsBetter: true,
                  url: isObject(entry.source) ? entry.source.url : "https://example.com",
                  description: "Migrated from a v1 catalog entry. Review the definition.",
                });
              }
              return [{
                id: typeof entry.id === "string" ? entry.id : `${benchmarkId}-migrated`,
                benchmarkId, score, display: String(entry.score).slice(0, 60), version: null,
                evaluatedAt: entry.date, conditions: typeof entry.note === "string" ? entry.note.slice(0, 1000) : null,
                reportedBy: "provider", source: entry.source,
              }];
            })
          : [];
        const releases = Array.isArray(model.releases)
          ? model.releases.map((entry) => isObject(entry)
              ? { ...entry, type: entry.type === "capability" ? "api-feature" : entry.type }
              : entry)
          : [];
        return {
          ...rest,
          family: typeof model.name === "string" ? model.name : "Unknown",
          categories: [v1TypeToCategory[String(type)] ?? "general"],
          status: model.status === "available" ? "active" : model.status,
          license: unknownFact(updatedAt),
          languages: unknownFact(updatedAt),
          capabilities,
          pricing: { ...pricing, cachedInput: unknownFact(updatedAt), other: unknownFact(updatedAt) },
          benchmarks,
          releases,
          editorial: { ...editorial, trending: false, trendSource: null },
        };
      })
    : raw.models;

  return {
    schemaVersion: 2,
    providers,
    models,
    benchmarks: [...definitions.values()],
    links: [],
    sponsored: [],
    changelog: [],
    updatedAt,
  };
}

export function parseCatalog(raw: unknown): Catalog {
  return catalogSchema.parse(migrateCatalog(raw));
}
