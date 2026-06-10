// Re-render the homepage in Chromium, let lazy-load resolve, then extract the
// fully-rendered <main>-area DOM (header + content + footer markers) with real
// image src values already in place. This avoids guessing lazy-image order.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://affdragons.com/", { waitUntil: "networkidle", timeout: 60000 });

// Scroll through to force every lazy image to load its real src.
await page.evaluate(async () => {
  await new Promise((res) => {
    let y = 0;
    const t = setInterval(() => {
      window.scrollBy(0, 500);
      y += 500;
      if (y >= document.body.scrollHeight) {
        clearInterval(t);
        res();
      }
    }, 60);
  });
});
await page.waitForTimeout(1500);

// Grab the rendered body HTML, then slice main = between </header> and <footer>.
// header/footer are nested deeper than body's direct children on this site.
const parts = await page.evaluate(() => {
  const header = document.querySelector("header")?.outerHTML || "";
  const footer = document.querySelector("footer")?.outerHTML || "";
  const bodyHtml = document.body.innerHTML;
  return { header, footer, bodyHtml };
});

const headerEnd = parts.bodyHtml.indexOf("</header>");
const footerStart = parts.bodyHtml.indexOf("<footer");
parts.main =
  headerEnd >= 0 && footerStart > headerEnd
    ? parts.bodyHtml.slice(headerEnd + "</header>".length, footerStart)
    : parts.bodyHtml;

await browser.close();

writeFileSync("tools/_home-rendered-main.html", parts.main);
writeFileSync("tools/_home-rendered-footer.html", parts.footer);
console.log("main length:", parts.main.length);
console.log("footer length:", parts.footer.length);
console.log("placeholders left in main:", (parts.main.match(/data:image\/svg/gi) || []).length);
console.log("real <img> in main:", (parts.main.match(/<img/gi) || []).length);
