import fs from "node:fs/promises";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome" });
const paths = process.env.LAYOUT_PATHS?.split(",") || ["/", "/episodes", "/about", "/host", "/category", "/blogs", "/contact", "/episodes/the-future-of-ai-powered-creativity", "/blogs/top-10-podcasts-every-creator-should-listen-to"];
const report = [];
await fs.mkdir("reference/comparison", { recursive: true });
for (const width of process.env.LAYOUT_WIDTHS?.split(",").map(Number) || [1440, 1024, 390]) {
  for (const route of paths) {
    const records = [];
    for (const [name, host] of [["original", "https://voxen.framer.website"], ["replica", process.env.TEST_BASE_URL || "http://localhost:3000"]]) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: "reduce" });
      await page.goto(host + route, { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
      const layout = await page.evaluate(() => ({
        height: document.body.scrollHeight,
        width: document.documentElement.scrollWidth,
        sections: Array.from(document.querySelectorAll('section[data-framer-name*="Section"], footer[data-framer-name="Footer"], h1')).filter((element) => element.getBoundingClientRect().height > 0).map((element) => {
          const rect = element.getBoundingClientRect();
          return { name: element.tagName === "H1" ? element.textContent : element.getAttribute("data-framer-name"), x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height };
        }),
      }));
      records.push({ name, ...layout });
      if (["/", "/episodes", "/contact"].includes(route)) {
        const key = `${width}-${route === "/" ? "home" : route.slice(1)}`;
        await page.screenshot({ path: `reference/comparison/${key}-${name}.png` });
      }
      await page.close();
    }
    const original = records[0], replica = records[1];
    const deltas = original.sections.map((section, index) => {
      const candidate = replica.sections[index];
      return { name: section.name, x: candidate ? candidate.x - section.x : null, y: candidate ? candidate.y - section.y : null, width: candidate ? candidate.width - section.width : null, height: candidate ? candidate.height - section.height : null };
    });
    const result = { route, viewport: width, pageHeightDelta: replica.height - original.height, overflow: replica.width > width, deltas };
    report.push(result);
    await fs.writeFile("reference/layout-comparison.json", JSON.stringify(report, null, 2));
    console.log(JSON.stringify(result));
  }
}
await fs.writeFile("reference/layout-comparison.json", JSON.stringify(report, null, 2));
await browser.close();
