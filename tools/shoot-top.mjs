// Screenshot just the viewport (top of page) at full resolution to compare the
// hero/header area precisely against the original.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
await page.goto("http://localhost:4321/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(600);
await page.screenshot({ path: "tools/local-top.png" }); // viewport only

// Report computed colours of the headings to verify white vs black.
const colors = await page.evaluate(() => {
  const out = {};
  const h1 = document.querySelector("h1");
  if (h1) out.h1 = getComputedStyle(h1).color;
  const h2s = [...document.querySelectorAll("h2")].slice(0, 3);
  out.h2 = h2s.map((h) => getComputedStyle(h).color);
  // is there a white strip? check the element right after header
  return out;
});
await browser.close();
console.log("H1 color:", colors.h1);
console.log("first H2 colors:", JSON.stringify(colors.h2));
console.log("saved tools/local-top.png");
