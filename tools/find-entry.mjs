import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

const types = JSON.parse(readFileSync("tools/page-types.json", "utf8"));
const offerSet = new Set(
  types.offer.map((u) => u.replace("https://affdragons.com/", "").replace(/\/$/, ""))
);

const pages = walk("site/raw");
const entry = [];
for (const p of pages) {
  const slug = p
    .replaceAll("\\", "/")
    .replace(/.*site\/raw\//, "")
    .replace(/\/index\.html$/, "");
  if (offerSet.has(slug)) continue; // skip offer pages themselves
  const h = readFileSync(p, "utf8");
  let count = 0;
  for (const m of h.matchAll(/href="https:\/\/affdragons\.com\/([a-z0-9-]+)\//gi)) {
    if (offerSet.has(m[1])) count++;
  }
  if (count > 0) entry.push({ slug, count });
}
entry.sort((a, b) => b.count - a.count);
console.log("NON-offer pages that link to offer pages (potential human entry points):");
entry.slice(0, 15).forEach((e) => console.log("  ", String(e.count).padStart(4), "offer links on /", e.slug));
if (entry.length === 0) console.log("  (none — offer pages are only reachable from other offer pages / sitemap)");
