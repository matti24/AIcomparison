import { z } from "zod";

import { CAPABILITIES, type AIModel, type Catalog, type Provider } from "./types";

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
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase kebab-case slug");

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

export const modelTypeSchema = z.enum([
  "general",
  "reasoning",
  "coding",
  "image",
  "video",
  "speech",
  "embedding",
  "research",
]);

export const useCaseSchema = z.enum([
  "coding",
  "writing",
  "research",
  "school",
  "business",
  "data-analysis",
  "image-creation",
  "video-creation",
  "customer-support",
  "agents",
  "general",
]);

export const productSchema = z.strictObject({
  name: text(160),
  description: text(2000),
  url: httpUrlSchema,
});

export const providerSchema = z.strictObject({
  id: idSchema,
  slug: slugSchema,
  name: text(160),
  description: text(5000),
  website: httpUrlSchema,
  country: text(100).nullable(),
  founded: z.number().int().min(1).max(new Date().getUTCFullYear()).nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color"),
  logo: logoSchema,
  products: z.array(productSchema).max(100),
  sources: z.array(sourceSchema).min(1).max(100),
  updatedAt: timestampSchema,
}) satisfies z.ZodType<Provider>;

export const benchmarkSchema = z.strictObject({
  id: idSchema,
  name: text(200),
  score: text(200),
  date: dateSchema,
  source: sourceSchema,
  note: text(3000).optional(),
});

export const modelReleaseSchema = z.strictObject({
  id: idSchema,
  date: dateSchema,
  title: text(250),
  description: text(4000),
  type: z.enum(["release", "pricing", "capability", "deprecation"]),
  source: sourceSchema,
});

export const capabilitiesSchema = z.record(
  z.enum(CAPABILITIES),
  factSchema(z.boolean()),
);

export const pricingSchema = z.strictObject({
  input: factSchema(nonnegativeNumber),
  output: factSchema(nonnegativeNumber),
  subscription: factSchema(nonnegativeNumber),
  currency: z.literal("USD"),
  unit: z.literal("1M tokens"),
});

export const editorialSchema = z.strictObject({
  rank: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  trending: z.boolean(),
  rationale: text(3000).min(20, "Explain the editorial selection, not an invented popularity score"),
  updatedAt: timestampSchema,
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
    description: text(5000),
    version: text(200),
    type: modelTypeSchema,
    status: z.enum(["available", "preview", "deprecated"]),
    releaseDate: factSchema(dateSchema),
    knowledgeCutoff: factSchema(knowledgeCutoffSchema),
    contextWindow: factSchema(tokenCount),
    maxOutput: factSchema(tokenCount),
    openness: factSchema(z.enum(["proprietary", "open-weights", "open-source"])),
    apiAvailable: factSchema(z.boolean()),
    freeAccess: factSchema(z.boolean()),
    speed: factSchema(z.enum(["fast", "balanced", "thorough"])),
    capabilities: capabilitiesSchema,
    pricing: pricingSchema,
    website: httpUrlSchema,
    apiDocs: httpUrlSchema.nullable(),
    bestFor: z.array(useCaseSchema).refine(uniqueStrings, "Use cases must be unique"),
    tags: z
      .array(text(100))
      .max(30)
      .refine(uniqueStrings, "Tags must be unique"),
    benchmarks: z.array(benchmarkSchema).max(200),
    releases: z.array(modelReleaseSchema).max(500),
    editorial: editorialSchema,
    addedAt: timestampSchema,
    updatedAt: timestampSchema,
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

export const catalogSchema = z
  .strictObject({
    providers: z.array(providerSchema).max(1000),
    models: z.array(modelSchema).max(10000),
    updatedAt: timestampSchema,
  })
  .superRefine((catalog, context) => {
    for (const collection of ["providers", "models"] as const) {
      for (const field of ["id", "slug"] as const) {
        const seen = new Set<string>();
        catalog[collection].forEach((record, index) => {
          if (seen.has(record[field])) {
            context.addIssue({
              code: "custom",
              path: [collection, index, field],
              message: `Duplicate ${collection} ${field}`,
            });
          }
          seen.add(record[field]);
        });
      }
    }

    const providerIds = new Set(catalog.providers.map((provider) => provider.id));
    catalog.models.forEach((model, index) => {
      if (!providerIds.has(model.providerId)) {
        context.addIssue({
          code: "custom",
          path: ["models", index, "providerId"],
          message: "The model must reference an existing provider",
        });
      }
    });
  }) satisfies z.ZodType<Catalog>;
