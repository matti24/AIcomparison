import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { seedCatalog } from "../../src/data/catalog";
import { comparisonPath, getProvider, sortModels } from "../../src/lib/catalog";
import { newModelTemplate, newProviderTemplate } from "../../src/lib/admin-templates";
import { catalogSchema } from "../../src/lib/catalog-schema";

const models = sortModels(seedCatalog.models.filter((model) => model.status !== "deprecated"), "featured");

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

test("homepage is a complete, branded discovery experience", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Compare the world'sleading AI models.");
  await expect(page.getByRole("link", { name: "Compare Models", exact: true })).toBeVisible();
  await expect(page.getByTestId("model-card")).toHaveCount(Math.min(6, models.filter((model) => model.editorial.trending).length));
  await expect(page.getByRole("heading", { name: "There's an AI for that. Let's find yours." })).toBeVisible();
  await page.getByRole("tab", { name: "Top coding" }).click();
  await expect(page.getByRole("tab", { name: "Top coding" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Recently released" }).click();
  await expect(page.getByTestId("model-card")).toHaveCount(Math.min(6, models.length));
  expect(errors).toEqual([]);
});

test("directory filters, search, sorting, table mode and empty states work", async ({ page }) => {
  await page.goto("/models");
  await expect(page.getByTestId("model-card")).toHaveCount(seedCatalog.models.length);
  await page.getByRole("textbox", { name: "Search models in directory" }).fill("models with video");
  const videos = seedCatalog.models.filter((model) => model.capabilities.videoInput.value === true || model.capabilities.videoOutput.value === true);
  await expect(page.getByTestId("model-card")).toHaveCount(videos.length);
  await page.getByRole("button", { name: "Table view", exact: true }).click();
  await expect(page.locator("table tbody tr")).toHaveCount(videos.length);
  await page.getByRole("button", { name: "Card view", exact: true }).click();
  await page.getByRole("textbox", { name: "Search models in directory" }).fill("this-model-cannot-possibly-exist");
  await expect(page.getByRole("heading", { name: "No models in this corner. Yet." })).toBeVisible();
  await page.getByRole("button", { name: "Clear all filters" }).click();
  await expect(page.getByTestId("model-card")).toHaveCount(seedCatalog.models.length);
  const provider = getProvider(seedCatalog, models[0].providerId);
  await page.getByLabel(provider.name, { exact: true }).check();
  await expect(page.getByTestId("model-card")).toHaveCount(seedCatalog.models.filter((model) => model.providerId === provider.id).length);
  await page.getByRole("combobox", { name: "Sort models" }).selectOption("cheapest");
  await page.reload();
  await expect(page.getByLabel(provider.name, { exact: true })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Sort models" })).toHaveValue("cheapest");
});

test("global search works by keyboard and navigates to a model", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search models and companies" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Search models and companies" })).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("textbox", { name: "Search models, companies, or capabilities" }).fill(models[0].name);
  await page.getByRole("dialog").getByRole("button", { name: new RegExp(models[0].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click();
  await expect(page).toHaveURL(`/models/${models[0].slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(models[0].name);
  await expect(page).toHaveTitle(new RegExp("Pricing, Context Window"));
});

test("discovery tabs and model-picker dialogs are keyboard accessible", async ({ page }) => {
  await page.goto("/");
  const firstTab = page.getByRole("tab", { name: "Trending", exact: true });
  await firstTab.click();
  await firstTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Recently released", exact: true })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Recently released", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Open models", exact: true })).toBeFocused();
  await page.goto("/compare");
  const add = page.getByRole("button", { name: "Add model 1", exact: true });
  await add.click();
  await expect(page.getByRole("textbox", { name: "Search models to compare" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(add).toBeFocused();
});

test("comparison builder selects 2-4 models and produces a shareable link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/compare");
  await page.getByRole("button", { name: "Add model 1", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox").fill(models[0].name);
  await page.getByRole("dialog").locator("button.search-result").first().click();
  await page.getByRole("button", { name: "Add model 2", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox").fill(models[1].name);
  await page.getByRole("dialog").locator("button.search-result").first().click();
  await page.getByRole("link", { name: "Compare 2 models", exact: true }).click();
  await expect(page).toHaveURL(comparisonPath([models[0].slug, models[1].slug]));
  await expect(page.locator(".desktop-comparison .comparison-model-header")).toHaveCount(2);
  const allRows = await page.locator(".desktop-comparison .comparison-data-row").count();
  await page.getByRole("button", { name: /Show Differences Only/ }).click();
  const differenceRows = await page.locator(".desktop-comparison .comparison-data-row").count();
  expect(differenceRows).toBeLessThan(allRows);
  await page.getByRole("button", { name: "Copy Comparison Link", exact: true }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(comparisonPath([models[0].slug, models[1].slug]));
  await page.getByRole("button", { name: "Add Model", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox").fill(models[2].name);
  await page.getByRole("dialog").locator("button.search-result").first().click();
  await expect(page).toHaveURL(comparisonPath([models[0].slug, models[1].slug, models[2].slug]));
  await page.getByRole("button", { name: "Add Model", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox").fill(models[3].name);
  await page.getByRole("dialog").locator("button.search-result").first().click();
  await expect(page).toHaveURL(comparisonPath(models.slice(0, 4).map((model) => model.slug)));
  await expect(page.locator(".desktop-comparison .comparison-model-header")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "Add Model", exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.locator(".desktop-comparison .comparison-model-header")).toHaveCount(4);
});

test("comparison swapping and removal update the URL", async ({ page }) => {
  await page.goto(comparisonPath(models.slice(0, 3).map((model) => model.slug)));
  await page.locator(".desktop-comparison").getByRole("button", { name: `Swap ${models[0].name}`, exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox").fill(models[3].name);
  await page.getByRole("dialog").locator("button.search-result").first().click();
  await expect(page).toHaveURL(comparisonPath([models[3].slug, models[1].slug, models[2].slug]));
  await page.locator(".desktop-comparison").getByRole("button", { name: `Remove ${models[2].name} from comparison`, exact: true }).click();
  await expect(page).toHaveURL(comparisonPath([models[3].slug, models[1].slug]));
  await expect(page.locator(".desktop-comparison .comparison-model-header")).toHaveCount(2);
});

test("floating comparison bar and maximum selection work", async ({ page }) => {
  await page.goto("/models");
  for (const model of models.slice(0, 4)) await page.getByRole("button", { name: `Add ${model.name} to comparison`, exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Selected models for comparison" })).toBeVisible();
  await page.getByRole("button", { name: `Add ${models[4].name} to comparison`, exact: true }).click();
  await expect(page.getByText("Your comparison is full", { exact: true })).toBeVisible();
  await expect(page.locator(".compare-bar-chip")).toHaveCount(4);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.locator(".compare-bar")).toHaveCount(0);
});

test("watchlist and recently viewed models persist after refresh", async ({ page }) => {
  await page.goto(`/models/${models[0].slug}`);
  await page.getByRole("button", { name: `Save ${models[0].name} to watchlist`, exact: true }).click();
  await page.goto("/watchlist");
  await expect(page.getByText("1 saved model", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 saved model", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Release & update history" }).click();
  if (models[0].releases.length) await expect(page.locator(".watchlist-update")).toHaveCount(models[0].releases.length);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pick up where you left off." })).toBeVisible();
});

test("finder explains matches and supports starting again", async ({ page }) => {
  await page.goto("/finder");
  await expect(page.getByRole("button", { name: "Next, your priorities" })).toBeDisabled();
  await page.getByRole("button", { name: "Coding Ship, debug, and build things", exact: true }).click();
  await page.getByRole("button", { name: "Next, your priorities" }).click();
  await page.getByRole("button", { name: "API access A model you can build into your app", exact: true }).click();
  await page.getByRole("button", { name: "Find my matches" }).click();
  await expect(page.getByRole("heading", { name: "A few good fits. Here's why." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Why this could work for you" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Start again" }).click();
  await expect(page.getByRole("heading", { name: "What do you mainly need AI for?" })).toBeVisible();
});

test("theme toggle persists and company profiles distinguish products from models", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const provider = getProvider(seedCatalog, models[0].providerId);
  await page.goto(`/companies/${provider.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(provider.name);
  await expect(page.getByRole("heading", { name: "Explore the model family." })).toBeVisible();
  if (provider.products.length) await expect(page.getByRole("heading", { name: "The products. Not the model versions." })).toBeVisible();
});

test("invalid model and comparison links show a non-indexable not-found state", async ({ page }) => {
  for (const path of ["/models/does-not-exist", `/compare/${models[0].slug}-vs-${models[0].slug}`, "/compare/missing-vs-missing-too", "/companies/does-not-exist"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Not every path leads to a model." })).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  }
});

test("mobile navigation, filters and comparison cards fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const button of await page.locator(".hero-actions a").all()) {
    const bounds = await button.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  }
  const contentBounds = await page.locator(".hero-grid").boundingBox();
  const searchBounds = await page.locator(".hero-search").boundingBox();
  expect(searchBounds!.x + searchBounds!.width).toBeLessThanOrEqual(contentBounds!.x + contentBounds!.width + 1);
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Models", exact: true }).click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByLabel("API available", { exact: true }).check();
  await page.getByRole("button", { name: /Show \d+ models/ }).click();
  await expect(page.getByTestId("model-card")).toHaveCount(seedCatalog.models.filter((model) => model.apiAvailable.value === true).length);
  await page.goto(comparisonPath(models.slice(0, 3).map((model) => model.slug)));
  await expect(page.locator(".mobile-comparison")).toBeVisible();
  await expect(page.locator(".mobile-comparison-card")).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const track = page.locator(".mobile-comparison-track");
  await track.evaluate((element) => element.scrollTo({ left: 390, behavior: "instant" }));
  expect(await track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});

test("admin denies unauthenticated writes and cross-origin login", async ({ request, baseURL }) => {
  const read = await request.get("/api/admin/catalog");
  expect(read.status()).toBe(401);
  const mutation = await request.put("/api/admin/catalog", { headers: { origin: baseURL! }, data: {} });
  expect(mutation.status()).toBe(401);
  const crossOrigin = await request.post("/api/admin/session", { headers: { origin: "https://untrusted.example" }, data: { password: "not-a-real-password" } });
  expect(crossOrigin.status()).toBe(403);
});

test("admin validates, publishes persistently and rejects stale writes", async ({ page }) => {
  test.skip(!process.env.ADMIN_PASSWORD, "Set up private admin credentials before running the authenticated admin workflow.");
  await page.goto("/admin");
  await page.getByLabel("Admin password", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Open the studio" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "The catalog studio." })).toBeVisible();
  await expect(page.getByText("The catalog is up to date.")).toBeVisible();
  const original = await readBrowserCatalog(page);
  try {
    await page.getByRole("textbox", { name: "Search catalog records" }).fill(models[0].name);
    const row = page.getByRole("row").filter({ hasText: models[0].name }).first();
    await row.getByRole("button", { name: "Details", exact: true }).click();
    const json = page.getByRole("textbox", { name: "Record JSON" });
    const model = JSON.parse(await json.inputValue());
    model.description = "A test-verified catalog update. Restored after the end-to-end test.";
    await json.fill(JSON.stringify(model, null, 2));
    await page.getByRole("button", { name: "Validate & apply" }).click();
    await expect(page.getByText("You have unpublished changes.")).toBeVisible();
    await page.getByRole("button", { name: "Publish catalog", exact: true }).click();
    await expect(page.getByText("The catalog is up to date.")).toBeVisible();
    const published = await readBrowserCatalog(page);
    expect(published.models.find((item) => item.slug === model.slug)?.description).toBe(model.description);
    const stale = await browserRequest(page, "/api/admin/catalog", "PUT", { catalog: original, expectedUpdatedAt: original.updatedAt });
    expect(stale.status).toBe(409);
    const publicPage = await page.request.get(`/models/${model.slug}`);
    expect(await publicPage.text()).toContain(model.description);
    const invalid = await browserRequest(page, "/api/admin/catalog", "PUT", { catalog: { ...published, models: [...published.models, published.models[0]] }, expectedUpdatedAt: published.updatedAt });
    expect(invalid.status).toBe(422);
  } finally {
    const latest = await readBrowserCatalog(page);
    const restored = await browserRequest(page, "/api/admin/catalog", "PUT", { catalog: original, expectedUpdatedAt: latest.updatedAt });
    expect(restored.status).toBe(200);
  }
  await page.reload();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Admin password", { exact: true })).toBeVisible();
});

test("admin can add a provider and model version with pricing, capabilities, benchmarks and releases", async ({ page }) => {
  test.skip(!process.env.ADMIN_PASSWORD, "Private admin credentials are required for the record-creation workflow.");
  await page.goto("/admin");
  await page.getByLabel("Admin password", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Open the studio" }).click();
  await expect(page.getByText("The catalog is up to date.")).toBeVisible();
  const original = await readBrowserCatalog(page);
  const now = new Date().toISOString();
  const source = { label: "Explicit end-to-end test fixture (not model data)", url: "https://example.com/test-fixture", checkedAt: now };
  const provider = {
    ...newProviderTemplate(original, now),
    id: "e2e-provider", slug: "e2e-provider", name: "E2E Test Provider",
    website: "https://example.com", sources: [source],
  };
  const model = {
    ...newModelTemplate(original, now),
    id: "e2e-model-v1", slug: "e2e-model-v1", name: "E2E Test Model v1",
    providerId: provider.id, website: "https://example.com/test-fixture",
    description: "A temporary end-to-end test fixture, not a real AI model.",
  };
  model.pricing.input = { value: 0.25, source, updatedAt: now, note: "Test fixture only." };
  model.capabilities.text = { value: true, source, updatedAt: now, note: "Test fixture only." };
  model.benchmarks = [{ id: "e2e-benchmark", name: "E2E fixture benchmark", score: "1/1 (test only)", date: now.slice(0, 10), source }];
  model.releases = [{ id: "e2e-release", date: now.slice(0, 10), title: "Test fixture release", description: "Temporary test fixture restored after this test.", type: "release", source }];
  try {
    await page.getByRole("button", { name: "Providers", exact: true }).click();
    await page.getByRole("button", { name: "Add provider", exact: true }).click();
    await page.getByRole("textbox", { name: "Record JSON" }).fill(JSON.stringify(provider, null, 2));
    await page.getByRole("button", { name: "Validate & apply" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Model versions", exact: true }).click();
    await page.getByRole("button", { name: "Add model", exact: true }).click();
    await page.getByRole("textbox", { name: "Record JSON" }).fill(JSON.stringify(model, null, 2));
    await page.getByRole("button", { name: "Validate & apply" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Publish catalog", exact: true }).click();
    await expect(page.getByText("The catalog is up to date.")).toBeVisible();
    await page.goto(`/models/${model.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(model.name);
    await expect(page.getByRole("cell", { name: "E2E fixture benchmark", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Test fixture release" })).toBeVisible();
    await expect(page.getByText("1/1 (test only)", { exact: true })).toBeVisible();
    const sitemap = await page.request.get("/sitemap.xml");
    expect(await sitemap.text()).toContain(`/models/${model.slug}`);
    await page.goto(`/companies/${provider.slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(provider.name);
    await expect(page.getByTestId("model-card")).toHaveCount(1);
  } finally {
    const latest = await readBrowserCatalog(page);
    const restored = await browserRequest(page, "/api/admin/catalog", "PUT", { catalog: original, expectedUpdatedAt: latest.updatedAt });
    expect(restored.status).toBe(200);
  }
});
