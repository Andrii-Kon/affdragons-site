// Downloads every same-origin asset recorded in tools/crawl-manifest.jsonl
// into site/raw/<path>, preserving the URL structure so local pages can
// reference them with the same paths.
//
// Usage: node tools/mirror-assets.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = "https://affdragons.com";
const OUT = "site/raw";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const lines = readFileSync("tools/crawl-manifest.jsonl", "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

// De-dupe by URL (manifest may contain repeats across resumed runs).
const seen = new Map(); // url -> type
for (const l of lines) {
  const [type, url] = l.split("\t");
  if (url && !seen.has(url)) seen.set(url, type);
}

function urlToFile(u) {
  let p = u.replace(ROOT, "").split("#")[0].split("?")[0];
  try {
    p = decodeURIComponent(p);
  } catch {}
  // sanitize characters illegal on Windows filesystems
  p = p.replace(/[<>:"|?*]/g, "_");
  return join(OUT, p);
}

const browserHeaders = { "User-Agent": UA, Referer: ROOT + "/" };
let ok = 0,
  skip = 0,
  fail = 0;
const failures = [];
const entries = [...seen.entries()];

console.log(`Mirroring ${entries.length} unique assets...\n`);

for (let i = 0; i < entries.length; i++) {
  const [url] = entries[i];
  const file = urlToFile(url);
  if (existsSync(file)) {
    skip++;
    continue;
  }
  try {
    const r = await fetch(url, { headers: browserHeaders });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, buf);
    ok++;
    if (i % 50 === 0) console.log(`[${i + 1}/${entries.length}] ${url}`);
  } catch (e) {
    fail++;
    failures.push({ url, error: e.message });
  }
}

if (failures.length)
  writeFileSync("tools/asset-failures.json", JSON.stringify(failures, null, 2));

console.log(`\nDONE. downloaded=${ok} skipped=${skip} failed=${fail}`);
