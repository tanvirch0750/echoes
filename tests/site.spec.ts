import { test, expect } from "@playwright/test";
import content from "../src/content/pages.json";

for (const width of [1440, 1024, 390]) {
  test.describe(`${width}px layouts`, () => {
    for (const route of Object.keys(content)) {
      test(`${route} renders without errors or horizontal overflow`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
        const response = await page.goto(route, { waitUntil: "networkidle" });
        expect(response?.status()).toBe(route === "/404" ? 404 : 200);
        await expect(page.locator("h1:visible").first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
        expect(errors).toEqual([]);
        const broken = await page.locator("img").evaluateAll((images) => (images as HTMLImageElement[]).filter((image) => image.complete && !image.naturalWidth).map((image) => image.src));
        expect(broken).toEqual([]);
      });
    }
  });
}

test("desktop menu navigates using the correct hydrated destinations", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(page.locator('header a[href="/blogs"]:visible')).toBeVisible();
  await page.locator('header a[href="/blogs"]:visible').click();
  await expect(page).toHaveURL(/\/blogs$/);
  await expect(page.getByRole("heading", { name: "IN THE SPOTLIGHT" })).toBeVisible();
});

test("mobile menu opens, navigates, and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await expect(page.locator('header a[href="/contact"]:visible')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('header a[href="/contact"]:visible')).toHaveCount(0);
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.locator('header a[href="/contact"]:visible').click();
  await expect(page).toHaveURL(/\/contact$/);
});

test("header and footer logos link home without a Framer URL mask", async ({ page }) => {
  await page.goto("/episodes/the-future-of-ai-powered-creativity");
  await expect(page.locator('header a:visible').first()).toHaveAttribute("href", "/");
  await expect(page.locator('footer a:has(img[alt="ECHOES logo"]):visible')).toHaveAttribute("href", "/");
  await page.locator('header a:visible').first().click();
  await expect(page).toHaveURL(/\/$/);
});

test("site metadata uses the ECHOES name and electric-blue accent", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ECHOES/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /ECHOES/);
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--voxen-gold").trim());
  expect(accent.toLowerCase()).toBe("#4f7cff");
});

test("episode search supports results, keyboard navigation, and Escape", async ({ page }) => {
  await page.goto("/episodes");
  await page.getByRole("button", { name: "Search Icon" }).click();
  const dialog = page.getByRole("dialog", { name: "Search episodes" });
  await dialog.getByRole("textbox").fill("creativity");
  await expect(dialog.locator("a").first()).toContainText("THE FUTURE OF AI-POWERED CREATIVITY");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/episodes\/the-future-of-ai-powered-creativity$/);
  await page.goto("/episodes");
  await page.getByRole("button", { name: "Search Icon" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("FAQs keep one answer open in each column", async ({ page }) => {
  await page.goto("/contact");
  const question = page.locator(".voxen-faq:visible").filter({ hasText: "Do you accept sponsors?" });
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(question).toContainText("Yes, we accept sponsors.");
  await expect(page.locator(".voxen-faq:visible").filter({ hasText: "How can I collaborate?" })).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".voxen-faq:visible").filter({ hasText: "How to become guest?" })).toHaveAttribute("aria-expanded", "true");
});

test("testimonials switch the quote and active portrait", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "Show testimonial 2", exact: true }).click();
  await expect(page.getByRole("button", { name: "Show testimonial 2", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".voxen-testimonials:visible").getByText("2 / 5", { exact: true })).toBeVisible();
});

test("episode video is local and closes with Escape", async ({ page }) => {
  await page.goto("/episodes/the-future-of-ai-powered-creativity");
  await page.getByRole("button", { name: "Play podcast video" }).click();
  const dialog = page.getByRole("dialog", { name: "Podcast video" });
  await expect(dialog.locator("video")).toHaveAttribute("src", /^\/assets\/.+\.mp4$/);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("contact and newsletter forms save submissions locally", async ({ page }) => {
  await page.goto("/contact");
  const form = page.locator('form.framer-1ab1ujh:visible');
  await form.getByPlaceholder("Enter Your Name").fill("Replica test");
  await form.getByPlaceholder("Enter Your Email Address").fill("replica-test@example.test");
  await form.locator("select").selectOption("Technology");
  await form.getByPlaceholder("Share your message with us...").fill("Automated local form validation.");
  await form.getByRole("button", { name: /Submit/ }).click();
  await expect(form.getByRole("status")).toHaveText("Thank you! Your message has been received.");
  const newsletter = page.locator("footer form:visible");
  await newsletter.getByPlaceholder("jane@framer.com").fill("newsletter-test@example.test");
  await newsletter.getByRole("button", { name: "Subscribe" }).click();
  await expect(newsletter.getByRole("status")).toHaveText("Thank you! You’re on the list.");
});

test("unknown routes return the original 404 design", async ({ page }) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "The Page Took a Break" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Home" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("runtime assets do not depend on Framer or Google servers", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => { if (/https:\/\/(?:[^/]*framer[^/]*|fonts\.gstatic\.com|fonts\.googleapis\.com)/.test(request.url())) external.push(request.url()); });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  expect(external).toEqual([]);
});

test("floating template promotions and platform badge are not rendered", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".framer-9zjJB, #__framer-badge-container, .voxen-reference-badge")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Download for FREE!" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Unlock 120+ Templates" })).toHaveCount(0);
});

test("form endpoint rejects invalid email and oversized content", async ({ request }) => {
  const invalid = await request.post("/api/submissions", { data: { kind: "newsletter", Email: "bad-email" } });
  expect(invalid.status()).toBe(400);
  const oversized = await request.post("/api/submissions", { data: { kind: "newsletter", Email: "valid@example.test", text: "x".repeat(17_000) } });
  expect(oversized.status()).toBe(413);
});
