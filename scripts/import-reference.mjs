/**
 * Import the authorized reference content as local, server-renderable templates.
 * No Framer runtime, analytics, editor, or remote page scripts ship with the site.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { load } from "cheerio";
import { chromium } from "@playwright/test";

const origin = "https://voxen.framer.website";
const root = process.cwd();
const dirs = ["reference", "public/assets", "public/styles", "src/content"];
await Promise.all(dirs.map((dir) => fs.mkdir(path.join(root, dir), { recursive: true })));
const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
const sources = [];
for (const url of urls) {
  const route = new URL(url).pathname;
  const key = route === "/" ? "home" : route.slice(1).replaceAll("/", "--");
  const html = await (await fetch(url)).text();
  await fs.writeFile(`reference/${key}.html`, html);
  sources.push({ url, route, key, html });
  console.log(`Read ${route}`);
}

const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const widgets = { navigation: {}, testimonials: {}, faqs: [], videos: {} };
for (const [name, width] of [["desktop", 1440], ["tablet", 1024], ["mobile", 390]]) {
  await page.setViewportSize({ width, height: name === "mobile" ? 844 : 1000 });
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
  const header = page.locator("header").first();
  const closed = await header.innerHTML();
  await header.locator(width < 1360 ? ".framer-pblrpj" : ".framer-AjWWc").click();
  await page.waitForTimeout(1400);
  const open = await header.innerHTML();
  widgets.navigation[name] = { closed, open };
  await page.goto(origin, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const testimonials = page.locator(".framer-Gghtx").filter({ visible: true }).first();
  const states = [];
  const count = name === "mobile" ? 3 : 5;
  for (let i = 0; i < count; i++) {
    const controls = testimonials.locator('[data-highlight="true"][tabindex="0"]');
    if (i) await controls.nth(i).click();
    else await testimonials.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);
    states.push(await testimonials.evaluate((el) => el.outerHTML));
  }
  widgets.testimonials[name] = states;
  await page.screenshot({ path: `reference/original-${name}-testimonials.png` });
  console.log(`Captured ${name} navigation and testimonials`);
}
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(`${origin}/contact`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const faqItems = page.locator('[data-framer-name="FAQ Wrapper"] h4');
const faqCount = await faqItems.count();
for (let i = 0; i < faqCount; i++) {
  const heading = faqItems.nth(i);
  const data = await heading.evaluate((el) => {
    const component = el.closest('[data-highlight="true"]');
    return { question: el.textContent, className: component?.className, html: component?.outerHTML };
  });
  await heading.click();
  await page.waitForTimeout(650);
  data.open = await heading.evaluate((el) => el.closest('[data-highlight="true"]')?.outerHTML);
  data.closed = load(data.html || "")("p").text() ? data.open : data.html;
  // The initially expanded questions are closed by the first click.
  if (!load(data.open || "")("p").text()) {
    await heading.click();
    await page.waitForTimeout(650);
    data.open = await heading.evaluate((el) => el.closest('[data-highlight="true"]')?.outerHTML);
  }
  widgets.faqs.push(data);
}
for (const source of sources.filter((s) => s.route.startsWith("/episodes/"))) {
  await page.goto(source.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const button = page.locator('button[data-framer-name="Play button"]').first();
  await button.click();
  await page.waitForTimeout(700);
  widgets.videos[source.route] = await page.locator("video").first().getAttribute("src");
}
await browser.close();

const assets = new Map();
function collect(text) {
  for (const match of text.matchAll(/https:\/\/(?:framerusercontent\.com\/(?:images|assets|third-party-assets)|fonts\.gstatic\.com)\/[^\s"'<>`\\)]+/g)) {
    const url = match[0].replaceAll("&amp;", "&").split("?")[0];
    if (!/\.(?:svg|png|jpe?g|webp|avif|gif|woff2?|ttf|mp4|webm)$/i.test(url)) continue;
    const ext = path.extname(new URL(url).pathname);
    const basename = path.basename(new URL(url).pathname);
    const name = basename.length > 70 ? `${createHash("sha256").update(url).digest("hex").slice(0,16)}${ext}` : basename;
    assets.set(url, `/assets/${name}`);
  }
}
sources.forEach((source) => collect(source.html));
collect(JSON.stringify(widgets));
// The WebGL image reveal is loaded by the original component rather than SSR.
collect("https://framerusercontent.com/images/jYV72WU46UGBxqqCPbW5x6ncic.jpg");
collect("https://framerusercontent.com/assets/E3xIYYANMaavHrfM2XQqk14Wr8.mp4");
let completed = 0;
const entries = [...assets];
async function download() {
  while (entries.length) {
    const [url, local] = entries.shift();
    const file = path.join(root, "public", local);
    try {
      await fs.access(file);
    } catch {
      let response;
      for (let retry = 0; retry < 3; retry++) {
        response = await fetch(url);
        if (response.ok) break;
      }
      if (!response.ok) throw new Error(`Asset ${response.status}: ${url}`);
      await fs.writeFile(file, Buffer.from(await response.arrayBuffer()));
    }
    completed++;
    if (completed % 20 === 0) console.log(`Stored ${completed}/${assets.size} assets`);
  }
}
await Promise.all(Array.from({ length: 6 }, download));

function localize(text) {
  return text.replace(/https:\/\/(?:framerusercontent\.com\/(?:images|assets|third-party-assets)|fonts\.gstatic\.com)\/[^\s"'<>`\\)]+/g, (url) => {
    const base = url.replaceAll("&amp;", "&").split("?")[0];
    return assets.get(base) || url;
  });
}

function cleanMarkup(html, url, { motion = true } = {}) {
  const $ = load(html, null, false);
  $("script, meta, link, iframe, noscript").remove();
  $("a[href]").each((_, element) => {
    const el = $(element), href = el.attr("href");
    if (!href || href.startsWith("#") || /^(mailto:|tel:)/.test(href)) return;
    const destination = new URL(href, url);
    if (destination.origin === origin) el.attr("href", destination.pathname + destination.search + destination.hash);
    if (el.attr("target") === "_blank") el.attr("rel", "noopener noreferrer");
  });
  $("[style]").each((_, element) => {
    const el = $(element);
    let style = el.attr("style");
    const isWord = element.name === "span" && /opacity:0\.001/.test(style);
    const isMotion = /will-change:\s*transform/.test(style) || el.is("[data-framer-appear-id]");
    if (motion && (isWord || isMotion)) {
      if ((/opacity:\s*(?:0(?:\.001)?)(?:;|$)/.test(style)) && !el.closest("header, .framer-Gghtx").length) {
        el.attr("data-voxen-reveal", isWord ? "word" : "element");
      }
      style = style.replace(/(?:^|;)(?:opacity|will-change|transform):[^;]+/g, "");
    }
    el.attr("style", style.replace(/^;/, ""));
  });
  $("video").each((_, element) => {
    const video = $(element);
    video.attr("playsinline", "");
    if (video.attr("preload") === "auto") video.attr("autoplay", "");
  });
  return localize($.html().replace(/<!--[\s\S]*?-->/g, ""));
}

const pages = {};
const search = [];
let fonts = "";
for (const source of sources) {
  const $ = load(source.html);
  fonts ||= $("style[data-framer-font-css]").text();
  const css = $("style").filter((_, element) => !$(element).is("[data-framer-font-css]")).map((_, element) => $(element).text()).get().join("\n");
  const main = $("#main");
  main.find("header").first().replaceWith("<voxen-header></voxen-header>");
  // Keep SVG sprite definitions, but strip the editor and all third-party scripts.
  const sprites = $("#svg-templates").prop("outerHTML") || "";
  const badge = main.find("#__framer-badge-container").length ? "" : $("#__framer-badge-container").prop("outerHTML") || "";
  main.find(".framer-Gghtx").each((_, element) => {
    const el = $(element), name = el.attr("data-framer-name") || "";
    const viewport = /Phone/.test(name) ? "mobile" : /Tablet/.test(name) ? "tablet" : "desktop";
    el.replaceWith(`<voxen-testimonials viewport="${viewport}"></voxen-testimonials>`);
  });
  if (source.route === "/contact") {
    main.find('[data-framer-name="FAQ Wrapper"] h4').each((_, element) => {
      const question = $(element).text();
      const index = widgets.faqs.findIndex((item) => item.question === question);
      const component = $(element).closest('[data-highlight="true"]');
      if (index >= 0) component.replaceWith(`<voxen-faq index="${index}"></voxen-faq>`);
    });
  }
  // The reference's lazy WebGL component has no SSR visual. Add its native island.
  main.find('[data-framer-name="Blob Image Reveal"]').each((_, element) => $(element).replaceWith("<voxen-blob></voxen-blob>"));
  const html = cleanMarkup(main.html() + sprites + badge, source.url);
  pages[source.route] = { key: source.key, html, title: $("title").text(), description: $('meta[name="description"]').attr("content") || "", video: widgets.videos[source.route] ? localize(widgets.videos[source.route]) : null };
  await fs.writeFile(`public/styles/${source.key}.css`, localize(css));
  const title = $("h1").first().text().replace(/\s+/g, " ").trim();
  if (source.route !== "/404") search.push({ path: source.route, title, text: $("#main").text().replace(/\s+/g, " ").slice(0, 14000) });
}
for (const [viewport, states] of Object.entries(widgets.navigation)) {
  widgets.navigation[viewport] = Object.fromEntries(Object.entries(states).map(([name, html]) => [name, cleanMarkup(html, origin, { motion: false })]));
}
for (const [viewport, states] of Object.entries(widgets.testimonials)) {
  widgets.testimonials[viewport] = states.map((html) => cleanMarkup(html, origin, { motion: false }));
}
widgets.faqs = widgets.faqs.map((item) => ({ question: item.question, closed: cleanMarkup(item.closed || item.html || "", origin, { motion: false }), open: cleanMarkup(item.open || "", origin, { motion: false }) }));
await fs.writeFile("public/styles/fonts.css", localize(fonts));
await fs.writeFile("src/content/pages.json", JSON.stringify(pages));
await fs.writeFile("src/content/widgets.json", JSON.stringify(widgets));
await fs.writeFile("src/content/search.json", JSON.stringify(search));
await fs.writeFile("src/content/assets.json", JSON.stringify(Object.fromEntries(assets), null, 2));
console.log(`Imported ${sources.length} pages and ${assets.size} local assets.`);
