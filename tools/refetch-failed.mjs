// Re-fetch just the assets in tools/asset-failures.json, slowly, with retries.
// These failed during the bulk mirror due to burst rate-limiting, not absence.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = "https://affdragons.com";
const OUT = "site/raw";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function urlToFile(u) {
  let p = u.replace(ROOT, "").split("#")[0].split("?")[0];
  try {
    p = decodeURIComponent(p);
  } catch {}
  p = p.replace(/[<>:"|?*]/g, "_");
  return join(OUT, p);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = JSON.parse(readFileSync("tools/asset-failures.json", "utf8"));
let ok = 0,
  stillFail = 0;
const remaining = [];

for (const { url } of fails) {
  const file = urlToFile(url);
  if (existsSync(file)) {
    ok++;
    continue;
  }
  let done = false;
  for (let attempt = 1; attempt <= 4 && !done; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, buf);
      ok++;
      done = true;
      console.log(`OK (try ${attempt}) ${url.split("/").pop()} (${(buf.length / 1024) | 0} KB)`);
    } catch (e) {
      if (attempt === 4) {
        stillFail++;
        remaining.push({ url, error: e.message });
        console.log(`FAIL ${url.split("/").pop()} :: ${e.message}`);
      } else {
        await sleep(800 * attempt); // back off, then retry
      }
    }
  }
  await sleep(400); // polite gap between distinct assets
}

writeFileSync("tools/asset-failures.json", JSON.stringify(remaining, null, 2));
console.log(`\nDONE. recovered=${ok} stillFail=${stillFail}`);
