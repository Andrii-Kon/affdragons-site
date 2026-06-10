// Capture the homepage with Elementor's runtime styles "baked in".
// Elementor's frontend JS reads data-settings and applies colours/backgrounds
// at runtime, so the raw HTML lacks them. We render the page, let JS run, then
// walk the DOM and write the computed colour/background/spacing onto each
// element as an inline style. The result renders identically with NO JS.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://affdragons.com/", { waitUntil: "networkidle", timeout: 60000 });

// fully scroll so lazy images + any deferred styling settle
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
    }, 50);
  });
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1500);

// In-page: bake computed visual props that Elementor applies via JS/vars.
const out = await page.evaluate(() => {
  const PROPS = [
    "color",
    "background-color",
    "background-image",
    "background-position",
    "background-size",
    "background-repeat",
    "border-radius",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-left-radius",
    "border-bottom-right-radius",
  ];
  // Buttons additionally need padding/border/text styling baked in.
  const BTN_PROPS = ["padding", "border", "text-align", "font-weight", "display"];
  // Only bake where it matters: text-bearing + section/column wrappers + buttons.
  const sel =
    "h1,h2,h3,h4,h5,h6,p,span,a,li,.elementor-section,.elementor-column,.elementor-widget-wrap,.elementor-button,.jet-button__instance,.jet-button__state,.jet-button__label,.jet-testimonials__item,.jet-testimonials__comment,.jet-testimonials__name,.jet-testimonials__position";
  document.querySelectorAll(sel).forEach((el) => {
    const cs = getComputedStyle(el);
    let add = "";
    const isButton =
      el.classList.contains("elementor-button") ||
      /\bbtn\b|button|jet-button/i.test(el.className || "");
    const props = isButton ? [...PROPS, ...BTN_PROPS] : PROPS;
    for (const p of props) {
      const v = cs.getPropertyValue(p);
      if (!v) continue;
      // skip transparent / none defaults to keep markup lean
      if (p === "background-color" && (v === "rgba(0, 0, 0, 0)" || v === "transparent")) continue;
      if (p.startsWith("background-") && p !== "background-color" && (v === "none" || v === "auto" || v === "0% 0%" || v === "repeat")) continue;
      add += `${p}:${v};`;
    }
    if (add) {
      const prev = el.getAttribute("style") || "";
      el.setAttribute("style", prev + (prev && !prev.endsWith(";") ? ";" : "") + add);
    }
  });

  const header = document.querySelector("header")?.outerHTML || "";
  const footer = document.querySelector("footer")?.outerHTML || "";
  const bodyHtml = document.body.innerHTML;
  return { header, footer, bodyHtml };
});

await browser.close();

const he = out.bodyHtml.indexOf("</header>");
const fs = out.bodyHtml.indexOf("<footer");
const main = he >= 0 && fs > he ? out.bodyHtml.slice(he + 9, fs) : out.bodyHtml;

writeFileSync("tools/_home-styled-main.html", main);
writeFileSync("tools/_home-styled-footer.html", out.footer);
console.log("styled main length:", main.length);
console.log("inline style= count in main:", (main.match(/ style="/g) || []).length);
console.log("placeholders left:", (main.match(/data:image\/svg/gi) || []).length);
