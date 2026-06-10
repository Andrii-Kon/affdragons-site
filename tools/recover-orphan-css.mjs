// The 24 "orphan" pages reference CSS cache bundles that 404 (WordPress purged
// the old hash). Re-fetch each page's CURRENT html, find the live CSS bundle it
// now serves, and download that bundle. Then rewrite the saved page to point at
// the live bundle so local styling works.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = "https://affdragons.com";
const OUT = "site/raw";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".html")) acc.push(p);
  }
  return acc;
}
function bundleRefs(html) {
  return [...html.matchAll(/href="https:\/\/affdragons\.com(\/wp-content\/cache\/min\/[^"]+\.css)[^"]*"/gi)].map(
    (m) => decodeURIComponent(m[1].split("?")[0])
  );
}
function fileToUrl(file) {
  let rel = file
    .replaceAll("\\", "/")
    .replace(OUT, "")
    .replace(/\/index\.html$/, "/")
    .replace(/\.html$/, "");
  return ROOT + rel;
}

// Find orphan pages (reference only dead bundles).
const orphans = [];
for (const p of walk(OUT)) {
  const refs = bundleRefs(readFileSync(p, "utf8"));
  if (refs.length && !refs.some((r) => existsSync(join(OUT, r)))) orphans.push(p);
}
console.log(`orphan pages to recover: ${orphans.length}\n`);

let fixed = 0,
  stillBad = 0;
for (const p of orphans) {
  const url = fileToUrl(p);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    const html = await r.text();
    const live = bundleRefs(html);
    // download any live bundle we don't yet have
    let gotLive = false;
    for (const ref of live) {
      const f = join(OUT, ref);
      if (existsSync(f)) {
        gotLive = true;
        continue;
      }
      const cr = await fetch(ROOT + ref, { headers: { "User-Agent": UA } });
      if (cr.ok) {
        mkdirSync(dirname(f), { recursive: true });
        writeFileSync(f, Buffer.from(await cr.arrayBuffer()));
        gotLive = true;
        console.log(`  + css ${ref.split("/").pop()} (${(cr.headers.get("content-length") || "?")})`);
      }
      await sleep(300);
    }
    if (gotLive) {
      // rewrite the saved page's dead bundle href(s) to the live one
      let saved = readFileSync(p, "utf8");
      const liveHref = live.find((ref) => existsSync(join(OUT, ref)));
      saved = saved.replace(
        /(href="https:\/\/affdragons\.com)\/wp-content\/cache\/min\/1\/[a-f0-9]+\.css/gi,
        `$1${liveHref}`
      );
      writeFileSync(p, saved);
      fixed++;
      console.log(`OK  ${url}`);
    } else {
      stillBad++;
      console.log(`??  ${url} (no live bundle found)`);
    }
  } catch (e) {
    stillBad++;
    console.log(`ERR ${url} :: ${e.message}`);
  }
  await sleep(500);
}
console.log(`\nDONE. fixed=${fixed} stillBad=${stillBad}`);
