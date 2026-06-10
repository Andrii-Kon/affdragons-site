// Headless crawler for affdragons.com (own site, off-WordPress migration).
//
// For each URL it:
//   - loads the page in Chromium and waits for Elementor JS to settle
//   - saves the fully rendered HTML under site/raw/<path>/index.html
//   - records every same-origin asset request (css/js/img/font) into a manifest
//
// Usage:
//   node tools/crawl.mjs --sample          # crawl a handful of representative pages
//   node tools/crawl.mjs                    # crawl every URL in tools/urls.json
//   node tools/crawl.mjs --limit 50         # crawl first 50
//   node tools/crawl.mjs --start 200 --limit 200   # resume a slice

import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = "https://affdragons.com";
const OUT = "site/raw";
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : d;
};

const SAMPLE = [
  `${ROOT}/`,
  `${ROOT}/advertisers/`,
  `${ROOT}/careers/`,
  `${ROOT}/events/`,
  `${ROOT}/contact/`,
  `${ROOT}/inhouse-offers/`,
  `${ROOT}/thailand-th-offers-with-prelander/`, // templated offer page
  // `${ROOT}/blog/`, // intentionally skipped until the blog migration is approved
  `${ROOT}/ru/`, // a non-English page
];

const { urls: ALL } = JSON.parse(readFileSync("tools/urls.json", "utf8"));

let targets;
if (flag("--sample")) {
  targets = SAMPLE;
} else {
  const start = parseInt(val("--start", "0"), 10);
  const limit = val("--limit", null);
  targets = limit ? ALL.slice(start, start + parseInt(limit, 10)) : ALL.slice(start);
}

// Map a URL to a local file path: https://affdragons.com/foo/ -> site/raw/foo/index.html
function urlToFile(u) {
  let p = u.replace(ROOT, "").split("#")[0].split("?")[0];
  if (p === "" || p === "/") p = "/index";
  if (p.endsWith("/")) p = p + "index";
  if (!/\.[a-z0-9]+$/i.test(p)) p = p + ".html";
  return join(OUT, p);
}

function ensureDir(file) {
  mkdirSync(dirname(file), { recursive: true });
}

const MANIFEST = "tools/crawl-manifest.jsonl";
const assets = new Set();

const browser = await chromium.launch();
const ctx = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  viewport: { width: 1440, height: 900 },
});

// Record every same-origin asset the pages fetch, so we can mirror them later.
ctx.on("requestfinished", (req) => {
  const u = req.url();
  if (u.startsWith(ROOT)) {
    const type = req.resourceType();
    if (["stylesheet", "script", "image", "font", "media"].includes(type)) {
      assets.add(`${type}\t${u}`);
    }
  }
});

const page = await ctx.newPage();
let ok = 0,
  fail = 0;
const failures = [];

console.log(`Crawling ${targets.length} URLs...\n`);

for (let i = 0; i < targets.length; i++) {
  const u = targets[i];
  const file = urlToFile(u);
  if (existsSync(file) && !flag("--force")) {
    ok++;
    continue; // resumable: skip already-saved pages
  }
  try {
    await page.goto(u, { waitUntil: "networkidle", timeout: 45000 });
    // Trigger lazy-loaded images by scrolling to the bottom.
    await page.evaluate(async () => {
      await new Promise((res) => {
        let y = 0;
        const t = setInterval(() => {
          window.scrollBy(0, 600);
          y += 600;
          if (y >= document.body.scrollHeight) {
            clearInterval(t);
            res();
          }
        }, 80);
      });
    });
    await page.waitForTimeout(500);
    const html = await page.content();
    ensureDir(file);
    writeFileSync(file, html);
    ok++;
    if (i % 20 === 0 || flag("--sample"))
      console.log(`[${i + 1}/${targets.length}] OK  ${u}  (${(html.length / 1024) | 0} KB)`);
  } catch (e) {
    fail++;
    failures.push({ url: u, error: e.message });
    console.log(`[${i + 1}/${targets.length}] FAIL ${u} :: ${e.message}`);
  }
}

await browser.close();

// Persist the asset manifest (append-safe across resumed runs).
if (assets.size) {
  ensureDir(MANIFEST);
  appendFileSync(MANIFEST, [...assets].join("\n") + "\n");
}
if (failures.length) writeFileSync("tools/crawl-failures.json", JSON.stringify(failures, null, 2));

console.log(`\nDONE. ok=${ok} fail=${fail} assets_seen=${assets.size}`);
