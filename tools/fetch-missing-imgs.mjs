// The local rebuild 404s on 24 testimonial/partner images that the crawler never
// captured (they live in JS sliders that only load on the active slide). Fetch
// them directly from the live site by their real URLs and save into public/.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

// Re-collect the exact 404 list from the local server.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const missing = new Set();
page.on("response", (r) => {
  if (r.status() === 404) {
    const u = r.url().replace("http://localhost:4321", "");
    if (u.includes("/wp-content/uploads/")) missing.add(u);
  }
});
await page.goto("http://localhost:4321/", { waitUntil: "networkidle", timeout: 60000 });
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
    }, 50);
  });
});
await page.waitForTimeout(800);
await browser.close();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
let ok = 0,
  fail = 0;
const stillMissing = [];
for (const rel of missing) {
  const dest = join("public", decodeURIComponent(rel));
  if (existsSync(dest)) {
    ok++;
    continue;
  }
  const url = "https://affdragons.com" + rel; // already URL-encoded form
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    ok++;
    console.log("OK  ", decodeURIComponent(rel).split("/").pop());
  } catch (e) {
    fail++;
    stillMissing.push({ rel, error: e.message });
    console.log("FAIL", decodeURIComponent(rel).split("/").pop(), "::", e.message);
  }
}
console.log(`\nDONE. ok=${ok} fail=${fail}`);
if (stillMissing.length) writeFileSync("tools/still-missing-imgs.json", JSON.stringify(stillMissing, null, 2));
