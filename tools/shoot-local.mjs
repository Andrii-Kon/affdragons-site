// Screenshot the locally-rebuilt homepage so we can compare it to the original.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

const resp = await page.goto("http://localhost:4321/", { waitUntil: "networkidle", timeout: 60000 });
console.log("HTTP status:", resp?.status());

// scroll to trigger any lazy assets, then full-page shot
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
    }, 60);
  });
});
await page.waitForTimeout(1000);
await page.screenshot({ path: "tools/local-home.png", fullPage: true });

// quick sanity signals
const h1 = await page.locator("h1").first().textContent().catch(() => null);
const imgCount = await page.locator("img").count();
const cssOk = await page.evaluate(() => {
  // is the captured stylesheet actually applied? check a known styled element
  const el = document.querySelector(".affd-header");
  if (!el) return "no .affd-header";
  const bg = getComputedStyle(el).backgroundColor;
  return `header bg=${bg}`;
});

await browser.close();
console.log("H1:", JSON.stringify(h1));
console.log("img count:", imgCount);
console.log("css signal:", cssOk);
console.log("console errors:", errors.length);
errors.slice(0, 10).forEach((e) => console.log("  !", e));
console.log("screenshot saved: tools/local-home.png");
