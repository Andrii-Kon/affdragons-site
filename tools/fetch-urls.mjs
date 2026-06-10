// Pulls every sitemap and writes the complete, de-duplicated URL list to urls.json.
import { writeFileSync } from "node:fs";

const ROOT = "https://affdragons.com";
const INDEX = `${ROOT}/sitemap.xml`;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function get(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}

// Grab every <loc>...</loc> value out of a sitemap or sitemap index.
// Values are wrapped in CDATA, e.g. <loc><![CDATA[https://...]]></loc>.
function locs(xml) {
  return [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*(https?:\/\/[^\]<\s]+?)\s*(?:\]\]>)?\s*<\/loc>/g)].map(
    (m) => m[1]
  );
}

const indexXml = await get(INDEX);
const childSitemaps = locs(indexXml);
console.log(`Sitemap index lists ${childSitemaps.length} child sitemaps.`);

const all = new Set();
for (const sm of childSitemaps) {
  try {
    const xml = await get(sm);
    const urls = locs(xml);
    urls.forEach((u) => all.add(u));
    console.log(`  ${sm} -> ${urls.length} urls`);
  } catch (e) {
    console.log(`  FAILED ${sm}: ${e.message}`);
  }
}

const list = [...all].sort();

// Classify by language and by section so we can see the shape of the job.
const byLang = { en: [], ru: [], uk: [] };
for (const u of list) {
  const p = u.replace(ROOT, "");
  if (p.startsWith("/ru/")) byLang.ru.push(u);
  else if (p.startsWith("/uk/")) byLang.uk.push(u);
  else byLang.en.push(u);
}

writeFileSync(
  "tools/urls.json",
  JSON.stringify({ count: list.length, byLang, urls: list }, null, 2)
);

console.log(`\nTOTAL unique URLs: ${list.length}`);
console.log(`  EN: ${byLang.en.length}  RU: ${byLang.ru.length}  UK: ${byLang.uk.length}`);
