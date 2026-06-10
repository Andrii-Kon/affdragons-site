// For every page, determine whether it references at least one CSS bundle
// that we actually have on disk. Pages that reference ONLY dead (404) bundles
// would lose styling and need attention; pages that also reference a live
// bundle are fine.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT = "site/raw";
function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

const pages = walk(OUT);
let onlyDead = 0,
  hasLive = 0,
  noCss = 0;
const orphans = [];

for (const p of pages) {
  const h = readFileSync(p, "utf8");
  const refs = [...h.matchAll(/href="https:\/\/affdragons\.com(\/wp-content\/cache\/min\/[^"]+\.css)[^"]*"/gi)].map(
    (m) => decodeURIComponent(m[1].split("?")[0])
  );
  if (refs.length === 0) {
    noCss++;
    continue;
  }
  const anyLive = refs.some((r) => existsSync(join(OUT, r)));
  if (anyLive) hasLive++;
  else {
    onlyDead++;
    orphans.push(p);
  }
}

console.log(`pages total: ${pages.length}`);
console.log(`  reference a CSS bundle we HAVE: ${hasLive}`);
console.log(`  reference ONLY dead bundles:    ${onlyDead}`);
console.log(`  reference no cache CSS at all:   ${noCss}`);
if (orphans.length) {
  console.log("\norphan pages (only dead CSS):");
  orphans.slice(0, 40).forEach((p) => console.log("  ", p));
}
