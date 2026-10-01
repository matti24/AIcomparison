import { capabilityLabels, categoryLabels, formatDate, formatPrice, formatTokens, opennessLabels, statusLabels } from "@/lib/catalog";
import type { AIModel, Capability, Provider } from "@/lib/types";

export interface NarrativeSection {
  id: string;
  title: string;
  paragraphs: string[];
}

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

const MULTIMODAL: Capability[] = ["imageInput", "imageOutput", "imageEditing", "audioInput", "audioOutput", "videoInput", "videoOutput", "realtime"];
const DEVELOPER: Capability[] = ["toolCalling", "structuredOutputs", "webSearch", "computerUse", "fineTuning", "batchApi", "selfHosting"];

function capabilityDiff(models: AIModel[], keys: Capability[]) {
  const lines: string[] = [];
  for (const key of keys) {
    const yes = models.filter((model) => model.capabilities[key].value === true).map((model) => model.name);
    const no = models.filter((model) => model.capabilities[key].value === false).map((model) => model.name);
    const unknown = models.filter((model) => model.capabilities[key].value === null).map((model) => model.name);
    if (yes.length === models.length) lines.push(`All compared models document ${capabilityLabels[key].toLowerCase()}.`);
    else if (yes.length && (no.length || unknown.length)) {
      lines.push(`${capabilityLabels[key]}: documented for ${list(yes)}${no.length ? `; documented as unsupported for ${list(no)}` : ""}${unknown.length ? `; not disclosed for ${list(unknown)}` : ""}.`);
    }
  }
  return lines;
}

/** Factual prose built only from structured catalog facts. Unknown values are stated as unknown. */
export function comparisonNarrative(models: AIModel[], providers: Map<string, Provider>): NarrativeSection[] {
  const names = models.map((model) => model.name);
  const providerOf = (model: AIModel) => providers.get(model.providerId)?.name ?? model.providerId;

  const overview = models.map((model) => {
    const released = model.releaseDate.value ? `released ${formatDate(model.releaseDate.value)}` : "with an undisclosed release date";
    const openness = model.openness.value ? opennessLabels[model.openness.value].toLowerCase() : "undisclosed-license";
    const article = /^[aeiou]/.test(openness) ? "an" : "a";
    return `${model.name} is ${article} ${openness} ${model.categories.map((category) => categoryLabels[category].toLowerCase()).slice(0, 2).join(" / ")} model from ${providerOf(model)}, ${released}, currently ${statusLabels[model.status].toLowerCase()}.`;
  });

  const pricing: string[] = [];
  const priced = models.filter((model) => model.pricing.input.value !== null);
  for (const model of models) {
    if (model.pricing.input.value !== null || model.pricing.output.value !== null) {
      pricing.push(`${model.name}: ${formatPrice(model.pricing.input.value, "undisclosed")} per million input tokens${model.pricing.cachedInput.value !== null ? ` (${formatPrice(model.pricing.cachedInput.value)} cached)` : ""} and ${formatPrice(model.pricing.output.value, "undisclosed")} per million output tokens.`);
    } else if (model.pricing.other.value) {
      pricing.push(`${model.name} is not priced per token: ${model.pricing.other.value}.`);
    } else {
      pricing.push(`${model.name} has no publicly disclosed API price in our sources.`);
    }
  }
  if (priced.length >= 2) {
    const sorted = [...priced].sort((a, b) => a.pricing.input.value! - b.pricing.input.value!);
    const low = sorted[0];
    const high = sorted.at(-1)!;
    if (high.pricing.input.value! > low.pricing.input.value!) {
      const ratio = high.pricing.input.value! / Math.max(low.pricing.input.value!, 0.0001);
      pricing.push(`By published standard input price, ${low.name} is the lower-cost option${ratio >= 1.5 ? ` — about ${ratio.toFixed(ratio >= 10 ? 0 : 1)}× cheaper than ${high.name}` : ""}. Real costs depend on output length, caching, and reasoning tokens.`);
    }
  }

  const context: string[] = models.map((model) => model.contextWindow.value !== null
    ? `${model.name} has a ${formatTokens(model.contextWindow.value)}-token context window${model.maxOutput.value !== null ? ` and up to ${formatTokens(model.maxOutput.value)} output tokens` : ""}.`
    : `${model.name} does not publicly disclose its context window in our sources.`);
  const withContext = models.filter((model) => model.contextWindow.value !== null);
  if (withContext.length >= 2) {
    const largest = [...withContext].sort((a, b) => b.contextWindow.value! - a.contextWindow.value!)[0];
    if (withContext.some((model) => model.contextWindow.value !== largest.contextWindow.value)) context.push(`${largest.name} has the largest published context window of the models compared.`);
  }

  const capabilities = capabilityDiff(models, ["reasoning", "coding", "multilingual"]);
  const developer = [
    ...models.map((model) => `${model.name}: ${model.apiAvailable.value === true ? "API available" : model.apiAvailable.value === false ? "no public API" : "API availability not disclosed"}.`),
    ...capabilityDiff(models, DEVELOPER),
  ];
  const multimodal = capabilityDiff(models, MULTIMODAL);

  const sections: NarrativeSection[] = [
    { id: "summary-overview", title: `${names.join(" vs ")}: overview`, paragraphs: overview },
    { id: "summary-pricing", title: "Pricing comparison", paragraphs: pricing },
    { id: "summary-context", title: "Context window comparison", paragraphs: context },
    { id: "summary-capabilities", title: "Capabilities", paragraphs: capabilities.length ? capabilities : ["The compared models document the same core reasoning, coding, and multilingual capabilities, or the differences are not disclosed."] },
    { id: "summary-developer", title: "Developer & API differences", paragraphs: developer },
    { id: "summary-multimodal", title: "Multimodal support", paragraphs: multimodal.length ? multimodal : ["No documented differences in image, audio, or video support between these models."] },
  ];
  return sections;
}

export function comparisonFaq(models: AIModel[]) {
  const faq: { q: string; a: string }[] = [];
  const names = models.map((model) => model.name).join(" or ");
  const priced = models.filter((model) => model.pricing.input.value !== null);
  if (priced.length >= 2) {
    const cheapest = [...priced].sort((a, b) => a.pricing.input.value! - b.pricing.input.value!)[0];
    faq.push({ q: `Is ${names} cheaper?`, a: `By published standard input price, ${cheapest.name} costs ${formatPrice(cheapest.pricing.input.value)} per million input tokens, the lowest of the models compared. Compare output and cached rates too, and estimate your workload with the calculator.` });
  }
  const withContext = models.filter((model) => model.contextWindow.value !== null);
  if (withContext.length >= 2) {
    const largest = [...withContext].sort((a, b) => b.contextWindow.value! - a.contextWindow.value!)[0];
    faq.push({ q: `Which has the larger context window, ${names}?`, a: `${largest.name} publishes ${formatTokens(largest.contextWindow.value)} tokens. ${withContext.filter((model) => model !== largest).map((model) => `${model.name}: ${formatTokens(model.contextWindow.value)}`).join("; ")}.` });
  }
  faq.push({ q: `Which is better, ${names}?`, a: "Neither is universally better. They differ in price, context, modalities, and published benchmark results; the right choice depends on your task. Test both on your own prompts — this page lists the documented differences with sources." });
  const open = models.filter((model) => model.openness.value === "open-weights" || model.openness.value === "open-source");
  if (open.length) faq.push({ q: "Can I self-host any of these models?", a: `${open.map((model) => model.name).join(", ")} ${open.length === 1 ? "publishes" : "publish"} downloadable weights. Check the linked license for usage conditions.` });
  return faq;
}
