import {
  capabilityLabels,
  categoryLabels,
  formatDate,
  formatPrice,
  formatTokens,
  getProvider,
  opennessLabels,
  statusLabels,
} from "@/lib/catalog";
import type { AIModel, Capability, Catalog, Fact, Source } from "@/lib/types";

export interface ComparisonCell {
  /** Raw value used for difference detection. */
  value: string | number | boolean | null;
  display: string;
  source?: Source | null;
  note?: string;
}

export interface ComparisonRow {
  key: string;
  label: string;
  help?: string;
  /** Numeric rows may highlight an objective extreme; never a subjective "winner". */
  highlight?: "lowest" | "highest";
  read: (model: AIModel) => ComparisonCell;
}

export interface ComparisonSection {
  id: string;
  title: string;
  rows: ComparisonRow[];
}

function fact<T extends string | number | boolean>(value: Fact<T>, display: (raw: T) => string): ComparisonCell {
  return {
    value: value.value,
    display: value.value === null ? "Not disclosed" : display(value.value),
    source: value.source,
    note: value.note,
  };
}

const yesNo = (value: boolean) => (value ? "Yes" : "No");
const tokens = (value: number) => `${formatTokens(value)} tokens`;

const capability = (key: Capability, label = capabilityLabels[key], help?: string): ComparisonRow => ({
  key,
  label,
  help,
  read: (model) => fact(model.capabilities[key], yesNo),
});

export function comparisonSections(catalog: Pick<Catalog, "providers">): ComparisonSection[] {
  return [
    {
      id: "overview",
      title: "Overview",
      rows: [
        { key: "provider", label: "Provider", read: (model) => { const name = getProvider(catalog, model.providerId).name; return { value: name, display: name }; } },
        { key: "release", label: "Release date", read: (model) => fact(model.releaseDate, (value) => formatDate(value)) },
        { key: "status", label: "Model status", read: (model) => ({ value: model.status, display: statusLabels[model.status] }) },
        { key: "type", label: "Model type", read: (model) => { const value = model.categories.map((category) => categoryLabels[category]).join(", "); return { value, display: value }; } },
        { key: "openness", label: "Open / proprietary", help: "Open weights let you download model weights; that is not always an open-source license.", read: (model) => fact(model.openness, (value) => opennessLabels[value]) },
        { key: "license", label: "License", read: (model) => fact(model.license, (value) => value) },
        { key: "cutoff", label: "Knowledge cutoff", read: (model) => fact(model.knowledgeCutoff, (value) => formatDate(value, "month")) },
      ],
    },
    {
      id: "pricing",
      title: "Pricing",
      rows: [
        { key: "input", label: "Input / 1M tokens", highlight: "lowest", help: "Standard published USD rate. Long-context, batch, priority, and regional tiers can differ.", read: (model) => fact(model.pricing.input, (value) => formatPrice(value)) },
        { key: "cachedInput", label: "Cached input / 1M", highlight: "lowest", help: "Rate for prompt-cache hits where the provider publishes one.", read: (model) => fact(model.pricing.cachedInput, (value) => formatPrice(value)) },
        { key: "output", label: "Output / 1M tokens", highlight: "lowest", help: "Reasoning tokens are typically billed as output.", read: (model) => fact(model.pricing.output, (value) => formatPrice(value)) },
        { key: "other", label: "Other pricing", help: "Non-token pricing (per image, per second, per minute) quoted verbatim.", read: (model) => fact(model.pricing.other, (value) => value) },
      ],
    },
    {
      id: "context",
      title: "Context",
      rows: [
        { key: "context", label: "Context window", highlight: "highest", help: "Maximum tokens per request, usually shared between input and output.", read: (model) => fact(model.contextWindow, tokens) },
        { key: "maxOutput", label: "Maximum output", highlight: "highest", read: (model) => fact(model.maxOutput, tokens) },
      ],
    },
    {
      id: "capabilities",
      title: "Capabilities",
      rows: [
        capability("reasoning"),
        capability("toolCalling"),
        capability("webSearch", "Web search", "Usually an optional, separately billed tool."),
        capability("computerUse"),
        capability("structuredOutputs"),
        capability("coding"),
        capability("multilingual"),
      ],
    },
    {
      id: "multimodal",
      title: "Multimodal",
      rows: [
        capability("text", "Text"),
        capability("imageInput", "Image input"),
        capability("imageOutput", "Image generation"),
        capability("imageEditing", "Image editing"),
        capability("videoInput", "Video input"),
        capability("videoOutput", "Video generation"),
        capability("audioInput", "Audio input"),
        capability("audioOutput", "Audio output"),
        capability("realtime", "Realtime"),
      ],
    },
    {
      id: "api",
      title: "API & developer",
      rows: [
        { key: "api", label: "API available", read: (model) => fact(model.apiAvailable, yesNo) },
        { key: "free", label: "Free access", read: (model) => fact(model.freeAccess, yesNo) },
        capability("fineTuning"),
        capability("batchApi", "Batch API"),
        capability("embeddings", "Embeddings"),
        capability("selfHosting", "Self-hosting"),
        { key: "languages", label: "Languages", read: (model) => fact(model.languages, (value) => value) },
        { key: "version", label: "API model ID", read: (model) => ({ value: model.version, display: model.version }) },
      ],
    },
  ];
}

export function rowIsDifferent(row: ComparisonRow, models: AIModel[]) {
  return new Set(models.map((model) => JSON.stringify(row.read(model).value))).size > 1;
}

/** Indices of models holding the objective numeric extreme for a highlighted row. */
export function highlightedIndices(row: ComparisonRow, models: AIModel[]) {
  if (!row.highlight) return [];
  const values = models.map((model) => row.read(model).value);
  const numbers = values.filter((value): value is number => typeof value === "number");
  if (numbers.length < 2) return [];
  const target = row.highlight === "lowest" ? Math.min(...numbers) : Math.max(...numbers);
  if (numbers.every((value) => value === target)) return [];
  return values.flatMap((value, index) => (value === target ? [index] : []));
}
