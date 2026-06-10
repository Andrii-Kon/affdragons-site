import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 820 } });
await page.goto("http://localhost:4321/", { waitUntil: "networkidle", timeout: 60000 });

const info = await page.evaluate(() => {
  const h1 = document.querySelector("h1.elementor-heading-title");
  if (!h1) return { err: "no h1" };
  const cs = getComputedStyle(h1);
  // climb ancestors, list their classes + computed color
  const chain = [];
  let el = h1;
  for (let i = 0; i < 6 && el; i++) {
    chain.push({
      tag: el.tagName,
      cls: (el.className || "").toString().slice(0, 80),
      color: getComputedStyle(el).color,
    });
    el = el.parentElement;
  }
  return { computedColor: cs.color, chain };
});

await browser.close();
console.log("H1 computed color:", info.computedColor);
console.log("ancestor chain (color each):");
(info.chain || []).forEach((c, i) => console.log(`  ${i} <${c.tag}> [${c.cls}] => ${c.color}`));
