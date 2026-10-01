import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { seedCatalog } from "../../src/data/catalog";
import { newModelTemplate, newProviderTemplate } from "../../src/lib/admin-templates";
import { comparisonPath, modelPath, popularComparisons, searchModels, sortModels, summarizeCatalog } from "../../src/lib/catalog";
import { catalogSchema } from "../../src/lib/catalog-schema";

// Tests run against a development/test instance whose catalog matches the reference seed.
const { models: summaries, providers } = summarizeCatalog(seedCatalog);
const featured = sortModels(summaries.filter((model) => model.status === "active"), "featured");

async function browserRequest(page: Page, path: string, method = "GET", data?: unknown) {
  return page.evaluate(async (options) => {
    const response = await fetch(options.path, {
      method: options.method,
      headers: options.data === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.data === undefined ? undefined : JSON.stringify(options.data),
      cache: "no-store",
    });
    const body: unknown = await response.json();
    return { status: response.status, body };
  }, { path, method, data });
}

async function readBrowserCatalog(page: Page) {
  const response = await browserRequest(page, "/api/admin/catalog");
  expect(response.status).toBe(200);
  return z.object({ catalog: catalogSchema }).parse(response.body).catalog;
}

async function signInAdmin(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("Admin password", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Catalog studio" })).toBeVisible();
  await expect(page.getByText("Draft matches the published catalog.")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  // Decline analytics so the consent banner does not cover content.
  await page.addInitScript(() => localStorage.setItem("ai-compare:consent:v1", "denied"));
});

test("homepage communicates the product with live catalog numbers and sourced trends", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("The AI model database", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Compare the world's leading AI models");
  await expect(page.getByRole("searchbox").or(page.getByLabel("Search AI models"))).toBeVisible();
  await expect(page.getByRole("link", { name: "Compare Models" })).toHaveAttribute("href", "/compare");
  await expect(page.getByRole("link", { name: "Explore Models" })).toHaveAttribute("href", "/models");
  await expect(page.locator(".trust-line")).toContainText(`Tracking ${seedCatalog.models.length} AI models across ${seedCatalog.providers.length} providers`);
  await expect(page.getByRole("heading", { name: "Trending now" })).toBeVisible();
  const trendCards = page.locator("ul[aria-labelledby='trending'] > li");
  expect(await trendCards.count()).toBeGreaterThan(0);
  await expect(trendCards.first().locator("a[target='_blank']")).toHaveAttribute("href", /^https?:\/\//);
  await expect(page.getByRole("heading", { name: "Popular comparisons" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recently released" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("explore filters, intent search, URL state, table view, and empty states", async ({ page }) => {
  await page.goto("/models");
  const search = page.getByRole("searchbox", { name: "Search models" });
  await search.fill("cheap coding");
  const expected = searchModels(summaries.filter((model) => model.status !== "retired"), providers, "cheap coding").results.length;
  await expect(page.getByRole("status")).toContainText(`${expected}`);
  await expect(page).toHaveURL(/q=cheap\+coding|q=cheap%20coding/);
  await expect(page.getByText("Input under $1/1M", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Table view" }).click();
  await expect(page).toHaveURL(/view=table/);
  await expect(page.locator("table tbody tr")).toHaveCount(expected);

  await search.fill("this-model-cannot-possibly-exist");
  await expect(page.getByRole("heading", { name: "No models match these filters." })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(search).toHaveValue("");

  await page.getByRole("button", { name: "Grid view" }).click();
  const openai = providers.find((provider) => provider.id === "openai")!;
  await page.locator("aside.filters").getByRole("checkbox", { name: new RegExp(`^${openai.name}`) }).check();
  await expect(page).toHaveURL(/provider=openai/);
  const cards = page.getByTestId("model-card");
  await expect(cards.first()).toContainText("OpenAI");

  await page.reload();
  await expect(page.locator("aside.filters").getByRole("checkbox", { name: new RegExp(`^${openai.name}`) })).toBeChecked();
});

test("command palette opens with keyboard shortcuts and understands comparisons", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.keyboard.press("Control+K");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.type("claude vs gemini");
  await expect(dialog.getByRole("option").first()).toContainText(" vs ");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/compare\/.+-vs-.+/);

  await page.locator("body").click({ position: { x: 5, y: 300 } });
  await page.keyboard.press("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.type(featured[0].name);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${featured[0].path}$`));
});

test("compare tray persists across navigation and enforces four models", async ({ page }) => {
  await page.goto("/models");
  const checkboxes = page.getByTestId("model-card").getByRole("checkbox");
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  const tray = page.getByRole("complementary", { name: "Comparison tray" });
  await expect(tray).toBeVisible();
  await expect(tray.getByRole("link", { name: /Compare 2/ })).toBeVisible();
  await page.goto("/providers");
  await expect(tray).toBeVisible();
  await page.goto("/models");
  await checkboxes.nth(2).check();
  await checkboxes.nth(3).check();
  await checkboxes.nth(4).click();
  await expect(page.getByText("Comparison is full")).toBeVisible();
  await tray.getByRole("link", { name: /Compare 4/ }).click();
  await expect(page).toHaveURL(/\/compare\/.+-vs-.+-vs-.+-vs-.+/);
});

test("comparison page: sticky sections, differences, highlights, removal, and canonical metadata", async ({ page, context }) => {
  const pair = popularComparisons(summaries)[0];
  const path = comparisonPath(pair.models.map((model) => model.slug));
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(pair.models[0].name);
  await expect(page.getByRole("navigation", { name: "Comparison sections" })).toBeVisible();
  const canonical = await page.locator("link[rel='canonical']").getAttribute("href");
  expect(canonical).toContain(comparisonPath([...pair.models.map((model) => model.slug)].sort()));
  await expect(page.getByRole("rowheader", { name: /Input \/ 1M tokens/ })).toBeVisible();

  const rowsBefore = await page.locator(".cmp-body .cmp-row").count();
  await page.getByLabel("Show differences only").check();
  expect(await page.locator(".cmp-body .cmp-row").count()).toBeLessThan(rowsBefore);
  await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toBeVisible();
  await expect(page.getByText("Neither is universally better", { exact: false })).toBeVisible();

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Link copied")).toBeVisible();

  await page.getByRole("button", { name: "Add model" }).click();
  await page.keyboard.type(featured.find((model) => !pair.models.some((entry) => entry.slug === model.slug))!.name);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: `Remove ${pair.models[0].name}` }).click();
  await expect(page).not.toHaveURL(new RegExp(pair.models[0].slug));
});

test("model profiles show sources, calculator, versions, and keep legacy URLs working", async ({ page }) => {
  const model = seedCatalog.models.find((entry) => entry.id === "gpt-6-1-sol")!;
  await page.goto("/models/gpt-6-1-sol");
  await expect(page).toHaveURL(modelPath("openai", "gpt-6-1-sol"));
  await expect(page.getByRole("heading", { level: 1 })).toContainText(model.name);
  await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "API cost calculator" })).toBeVisible();
  await expect(page.getByText("Pricing last verified", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Favorite", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/favorites");
  await expect(page.getByTestId("model-card")).toHaveCount(1);
  const outbound = await page.request.get(`/go/model/${model.id}`, { maxRedirects: 0 });
  expect(outbound.status()).toBe(302);
  expect(outbound.headers().location).toContain("utm_source=aicompare");
});

test("AI finder walks four steps and explains every match", async ({ page }) => {
  await page.goto("/ai-finder");
  for (const answer of ["Coding", "Low API cost", "Yes", "No preference"]) {
    await page.getByRole("radio", { name: new RegExp(`^${answer.replace(/[()]/g, "\\$&")}`) }).click();
  }
  await expect(page.getByRole("heading", { name: /models match your answers/ })).toBeVisible();
  const cards = page.getByTestId("model-card");
  expect(await cards.count()).toBeGreaterThanOrEqual(3);
  await expect(cards.first()).toContainText("Why it matches");
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
});

test("release feed, benchmarks, providers, and calculator render real data", async ({ page }) => {
  await page.goto("/releases");
  await expect(page.locator(".feed-entry").first()).toBeVisible();
  await page.getByRole("button", { name: "Deprecation" }).click();
  await expect(page.locator(".feed-entry .badge-deprecated").first()).toBeVisible();

  await page.goto("/benchmarks");
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  await expect(page.getByText("Provider-reported", { exact: true }).first()).toBeVisible();

  await page.goto("/providers/openai");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("OpenAI");
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();

  await page.goto("/pricing-calculator");
  await page.getByLabel("Requests / day").fill("10000");
  await expect(page.getByText("300,000 requests/month", { exact: false })).toBeVisible();
});

test("newsletter validates email and SEO endpoints are complete", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("footer form");
  await form.getByLabel("Email address").fill("not-an-email");
  await form.getByRole("button", { name: "Subscribe" }).click();
  await expect(form.getByRole("alert")).toBeVisible();

  const index = await (await page.request.get("/sitemap.xml")).text();
  for (const name of ["models", "providers", "comparisons", "categories", "content"]) expect(index).toContain(`/sitemaps/${name}.xml`);
  const modelsMap = await (await page.request.get("/sitemaps/models.xml")).text();
  expect(modelsMap).toContain(modelPath("openai", "gpt-6-1-sol"));
  const robots = await (await page.request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  await page.goto("/models/coding");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("AI models for coding");
  expect(await page.locator("script[type='application/ld+json']").count()).toBeGreaterThan(0);
});

test("invalid links render a non-indexed not-found page", async ({ page }) => {
  for (const path of ["/models/openai/not-a-real-model", "/compare/not-real-vs-also-not-real", "/providers/not-a-provider"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  }
});

test("mobile layouts have no horizontal overflow and use drawers", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/", "/models", "/compare", comparisonPath(featured.slice(0, 2).map((model) => model.slug)), featured[0].path, "/releases", "/benchmarks"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), path).toBe(true);
  }
  await page.goto("/models");
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
  await page.getByRole("button", { name: /^Show \d+ results$/ }).click();
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();
});

test("admin denies unauthenticated access and cross-origin login", async ({ request, baseURL }) => {
  expect((await request.get("/api/admin/catalog")).status()).toBe(401);
  expect((await request.get("/api/admin/analytics")).status()).toBe(401);
  expect((await request.get("/api/admin/subscribers")).status()).toBe(401);
  expect((await request.put("/api/admin/catalog", { headers: { origin: baseURL! }, data: {} })).status()).toBe(401);
  const crossOrigin = await request.post("/api/admin/session", { headers: { origin: "https://untrusted.example" }, data: { password: "not-a-real-password" } });
  expect(crossOrigin.status()).toBe(403);
});

test("admin publishes edits with updated_by and rejects stale writes", async ({ page }) => {
  test.skip(!process.env.ADMIN_PASSWORD, "Set up private admin credentials before running the authenticated admin workflow.");
  await signInAdmin(page);
  const original = await readBrowserCatalog(page);
  const target = featured[0];
  try {
    await page.getByRole("tab", { name: /Models/ }).click();
    await page.getByRole("textbox", { name: "Filter records" }).fill(target.name);
    await page.getByRole("row").filter({ hasText: target.name }).first().getByRole("button", { name: "Details", exact: true }).click();
    const json = page.getByRole("textbox", { name: "Record JSON" });
    const model = JSON.parse(await json.inputValue());
    model.description = "A test-verified catalog update. Restored after the end-to-end test.";
    await json.fill(JSON.stringify(model, null, 2));
    await page.getByRole("button", { name: "Validate & apply" }).click();
    await expect(page.getByText("Unpublished changes in your draft.")).toBeVisible();
    await page.getByRole("button", { name: "Publish catalog", exact: true }).click();
    await expect(page.getByText("Draft matches the published catalog.")).toBeVisible();
    const published = await readBrowserCatalog(page);
    const saved = published.models.find((item) => item.slug === model.slug)!;
    expect(saved.description).toBe(model.description);
    expect(saved.updatedBy).toBe("admin");
    const stale = await browserRequest(page, "/api/admin/catalog", "PUT", { catalog: original, expectedUpdatedAt: original.updatedAt });
    expect(stale.status).toBe(409);
    expect(await (await page.request.get(target.path)).text()).toContain(model.description);
  } finally {
    const latest = await readBrowserCatalog(page);
    const restored = await browserRequest(page, "/api/admin/catalog", "PUT", { catalog: original, expectedUpdatedAt: latest.updatedAt });
    expect(restored.status).toBe(200);
  }
});

test("admin can add a provider and a sourced model that appears publicly", async ({ page }) => {
  test.skip(!process.env.ADMIN_PASSWORD, "Private admin credentials are required for the record-creation workflow.");
  await signInAdmin(page);
  const original = await readBrowserCatalog(page);
  const now = new Date().toISOString();
  const source = { label: "Explicit end-to-end test fixture (not model data)", url: "https://example.com/test-fixture", checkedAt: now };
  const provider = { ...newProviderTemplate(original, now), id: "e2e-provider", slug: "e2e-provider", name: "E2E Test Provider", website: "https://example.com", sources: [source] };
  const model = {
    ...newModelTemplate(original, now),
    id: "e2e-model-v1", slug: "e2e-model-v1", name: "E2E Test Model v1", providerId: provider.id,
    website: "https://example.com/test-fixture", description: "A temporary end-to-end test fixture, not a real AI model.",
  };
  model.pricing.input = { value: 0.25, source, updatedAt: now, note: "Test fixture only." };
  model.capabilities.text = { value: true, source, updatedAt: now };
  model.benchmarks = [{ id: "e2e-benchmark", benchmarkId: "mmlu-pro", score: 1, display: "1% (test only)", version: null, evaluatedAt: now.slice(0, 10), conditions: "Fixture", reportedBy: "provider", source }];
  model.releases = [{ id: "e2e-release", date: now.slice(0, 10), title: "Test fixture release", description: "Temporary fixture.", type: "release", source }];
  try {
    await page.getByRole("tab", { name: /Providers/ }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("textbox", { name: "Record JSON" }).fill(JSON.stringify(provider, null, 2));
    await page.getByRole("button", { name: "Validate & apply" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("tab", { name: /Models/ }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("textbox", { name: "Record JSON" }).fill(JSON.stringify(model, null, 2));
    await page.getByRole("button", { name: "Validate & apply" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Publish catalog", exact: true }).click();
    await expect(page.getByText("Draft matches the published catalog.")).toBeVisible();
    await page.goto(modelPath(provider.slug, model.slug));
    await expect(page.getByRole("heading", { level: 1 })).toContainText(model.name);
    await expect(page.getByText("1% (test only)", { exact: true })).toBeVisible();
    await expect(page.getByText("Test fixture release", { exact: false }).first()).toBeVisible();
    expect(await (await page.request.get("/sitemaps/models.xml")).text()).toContain(modelPath(provider.slug, model.slug));
  } finally {
    const latest = await readBrowserCatalog(page);
    const restored = await browserRequest(page, "/api/admin/catalog", "PUT", { catalog: original, expectedUpdatedAt: latest.updatedAt });
    expect(restored.status).toBe(200);
  }
});
