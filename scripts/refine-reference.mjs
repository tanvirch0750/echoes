import fs from "node:fs/promises";
import { chromium } from "@playwright/test";
import { load } from "cheerio";

const widgets = JSON.parse(await fs.readFile("src/content/widgets.json", "utf8"));
const assets = JSON.parse(await fs.readFile("src/content/assets.json", "utf8"));
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
const page = await browser.newPage();
widgets.hero = {};
for (const [viewport, width] of [["desktop", 1440], ["tablet", 1024]]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto("https://voxen.framer.website/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const html = await page.locator(".framer-zPhSk").filter({ visible: true }).first().evaluate((element) => element.outerHTML);
  const $ = load(html, null, false);
  $("script, iframe").remove();
  $("a[href]").each((_, element) => {
    const el = $(element), href = el.attr("href");
    if (href && !href.startsWith("#")) { const url = new URL(href, "https://voxen.framer.website/"); if (url.origin === "https://voxen.framer.website") el.attr("href", url.pathname); }
  });
  widgets.hero[viewport] = $.html().replace(/https:\/\/framerusercontent\.com\/(?:images|assets)\/[^\s"'<>\\)]+/g, (url) => assets[url.replaceAll("&amp;", "&").split("?")[0]] || url);
}
await browser.close();
await fs.writeFile("src/content/widgets.json", JSON.stringify(widgets));
console.log("Captured loaded hero states.");
