import { capabilityLabels, formatContext, formatDate, formatPrice, getModalities, getProvider, typeLabels } from "@/lib/catalog";
import type { AIModel, Capability, Catalog, Fact, Source } from "@/lib/types";

export interface ComparisonCell {
  value: string | number | boolean | null;
  display?: string;
  source?: Source | null;
  note?: string;
}

export interface ComparisonRow {
  key: string;
  label: string;
  help?: string;
  read: (model: AIModel) => ComparisonCell;
}

export interface ComparisonGroup {
  title: string;
  rows: ComparisonRow[];
}

function cell<T extends string | number | boolean>(fact: Fact<T>, display?: string): ComparisonCell {
  return { value: fact.value, display, source: fact.source, note: fact.note };
}

const capabilityRow = (key: Capability): ComparisonRow => ({
  key,
  label: capabilityLabels[key],
  read: (model) => cell(model.capabilities[key]),
});

export function comparisonGroups(catalog: Catalog): ComparisonGroup[] {
  return [
    {
      title: "The essentials",
      rows: [
        { key: "provider", label: "Provider", read: (model) => ({ value: getProvider(catalog, model.providerId).name }) },
        { key: "version", label: "Model version", read: (model) => ({ value: model.version }) },
        { key: "release", label: "Release date", read: (model) => cell(model.releaseDate, formatDate(model.releaseDate.value)) },
        { key: "type", label: "Model type", read: (model) => ({ value: typeLabels[model.type] }) },
        { key: "status", label: "Status", read: (model) => ({ value: model.status, display: model.status[0].toUpperCase() + model.status.slice(1) }) },
        { key: "license", label: "License", help: "Open weights allow downloading model weights, but are not necessarily open-source. Check the source license for conditions.", read: (model) => cell(model.openness) },
      ],
    },
    {
      title: "Pricing & access",
      rows: [
        { key: "input", label: "Input / 1M tokens", help: "USD for one million input tokens. Standard published tier; caching, tools, long context, and provider pricing may differ.", read: (model) => cell(model.pricing.input, formatPrice(model.pricing.input.value)) },
        { key: "output", label: "Output / 1M tokens", help: "USD for one million generated tokens. Reasoning tokens may also be billed as output.", read: (model) => cell(model.pricing.output, formatPrice(model.pricing.output.value)) },
        { key: "subscription", label: "Subscription / month", help: "Product-level subscription, when documented. A subscription is not an API plan or a guarantee of unlimited model access.", read: (model) => cell(model.pricing.subscription, formatPrice(model.pricing.subscription.value)) },
        { key: "api", label: "API available", read: (model) => cell(model.apiAvailable) },
        { key: "free", label: "Free access", help: "A documented free plan or access path. Usage limits and availability can change.", read: (model) => cell(model.freeAccess) },
      ],
    },
    {
      title: "Context & performance",
      rows: [
        { key: "context", label: "Context window", help: "Maximum tokens in a request, usually shared between input and output. Deployment and pricing tiers may change the limit.", read: (model) => cell(model.contextWindow, `${formatContext(model.contextWindow.value)}${model.contextWindow.value === null ? "" : " tokens"}`) },
        { key: "outputLimit", label: "Maximum output", read: (model) => cell(model.maxOutput, `${formatContext(model.maxOutput.value)}${model.maxOutput.value === null ? "" : " tokens"}`) },
        { key: "cutoff", label: "Knowledge cutoff", read: (model) => cell(model.knowledgeCutoff) },
        { key: "speed", label: "Speed category", help: "Only shown when a reliable source supports the category. This is not a standardized latency benchmark.", read: (model) => cell(model.speed) },
        capabilityRow("reasoning"),
        capabilityRow("coding"),
        capabilityRow("multilingual"),
      ],
    },
    {
      title: "Modalities & creation",
      rows: [
        { key: "modalities", label: "Supported modalities", read: (model) => ({ value: getModalities(model).join(", ") || null }) },
        ...(["text", "imageInput", "imageOutput", "audioInput", "audioOutput", "videoInput", "videoOutput"] as const).map(capabilityRow),
      ],
    },
    {
      title: "Build & deploy",
      rows: [
        capabilityRow("webSearch"),
        capabilityRow("toolCalling"),
        capabilityRow("structuredOutputs"),
        capabilityRow("fineTuning"),
        capabilityRow("selfHosting"),
      ],
    },
  ];
}

export function rowIsDifferent(row: ComparisonRow, models: AIModel[]) {
  return new Set(models.map((model) => row.read(model).value)).size > 1;
}
