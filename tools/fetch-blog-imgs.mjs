// Download the blog-post images referenced by the built pages but missing
// locally (the blog was skipped during the original mirror). Reads the list
// produced by the scan and fetches each from the live site into public/.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = "https://affdragons.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const list = readFileSync("tools/blog-missing-imgs.txt", "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, fail = 0;
const stillMissing = [];

for (let i = 0; i < list.length; i++) {
  const rel = list[i];
  const dest = join("public", decodeURIComponent(rel));
  if (existsSync(dest)) { ok++; continue; }
  const url = ROOT + rel; // already URL-encoded form from the HTML
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    ok++;
    if (i % 50 === 0) console.log(`[${i + 1}/${list.length}] ${rel.split("/").pop()}`);
  } catch (e) {
    fail++;
    stillMissing.push({ rel, error: e.message });
  }
  if (i % 5 === 0) await sleep(40); // be polite
}

if (stillMissing.length) writeFileSync("tools/blog-imgs-still-missing.json", JSON.stringify(stillMissing, null, 2));
console.log(`\nDONE. downloaded/ok=${ok} failed=${fail}`);
if (stillMissing.length) console.log(`still missing (likely truly absent on server): ${stillMissing.length}`);
