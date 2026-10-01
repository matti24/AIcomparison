import { expect, test } from "@playwright/test";

test.use({ colorScheme: "light", reducedMotion: "no-preference" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("theme")) localStorage.setItem("theme", "light");
    localStorage.setItem("ai-compare:consent:v1", "denied");
  });
});

test("theme switch slides on click, changes the theme and persists after reload", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const toggle = page.getByRole("switch", { name: "Dark mode" });
  const thumb = toggle.locator(".theme-switch-thumb");
  await expect(toggle).toHaveAttribute("aria-checked", "false");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveClass(/dark/);
  const transitions = await thumb.evaluate((element) => element.getAnimations().map((animation) => ({
    property: animation instanceof CSSTransition ? animation.transitionProperty : null,
    duration: animation.effect?.getTiming().duration,
  })));
  expect(transitions).toContainEqual({ property: "transform", duration: 220 });
  await expect.poll(() => thumb.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41)).toBe(24);
  await expect(toggle.locator(".theme-switch-moon")).toHaveCSS("opacity", "1");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");

  await page.reload({ waitUntil: "networkidle" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect.poll(() => thumb.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41)).toBe(0);
  await expect(toggle.locator(".theme-switch-sun")).toHaveCSS("opacity", "1");
});

test("theme switch supports keyboard, system preference and footer synchronization", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const toggle = page.getByRole("switch", { name: "Dark mode" });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-checked", "false");

  const selector = page.getByRole("combobox", { name: "Theme", exact: true });
  await selector.selectOption("system");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await selector.selectOption("light");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(selector).toHaveValue("dark");
});

test("theme switch respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "networkidle" });
  const toggle = page.getByRole("switch", { name: "Dark mode" });
  const thumb = toggle.locator(".theme-switch-thumb");
  const durations = await thumb.evaluate((element) => getComputedStyle(element).transitionDuration.split(",").map((value) => Number.parseFloat(value)));
  expect(durations.every((duration) => duration <= 0.001)).toBe(true);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(thumb).toHaveCSS("transform", "matrix(1, 0, 0, 1, 24, 0)");
});

test("mobile navigation has the same switch with an accessible touch target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const toggle = page.getByRole("dialog").getByRole("switch", { name: "Dark mode" });
  await expect(toggle).toBeVisible();
  const size = await toggle.boundingBox();
  expect(size!.height).toBeGreaterThanOrEqual(44);
  expect(size!.width).toBeGreaterThanOrEqual(44);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
