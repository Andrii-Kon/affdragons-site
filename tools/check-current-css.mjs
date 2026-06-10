import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const missing = "301000eac82f4490f03449528986aa9f.css";

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

const pages = walk("site/raw");
let hit;
for (const p of pages) {
  if (readFileSync(p, "utf8").includes(missing)) {
    hit = p;
    break;
  }
}
console.log("page referencing missing bundle:", hit);

// Derive the live URL from the file path.
let rel = hit
  .replaceAll("\\", "/")
  .replace("site/raw", "")
  .replace(/\/index\.html$/, "/")
  .replace(/\.html$/, "");
const url = "https://affdragons.com" + rel;
console.log("live url:", url);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const r = await fetch(url, { headers: { "User-Agent": UA } });
const html = await r.text();
const css = [...html.matchAll(/href=["']([^"']*\/cache\/min\/[^"']*\.css)[^"']*/gi)].map(
  (m) => m[1]
);
console.log("CURRENT css bundle(s) served now:");
css.forEach((u) => console.log("  ", u));
