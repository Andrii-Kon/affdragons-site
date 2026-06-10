// List exactly which URLs 404 on the local rebuild, so we can fix asset paths.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const missing = [];
page.on("response", (r) => {
  if (r.status() === 404) missing.push(r.url().replace("http://localhost:4321", ""));
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
console.log("404 count:", missing.length);
[...new Set(missing)].forEach((u) => console.log("  ", u));
