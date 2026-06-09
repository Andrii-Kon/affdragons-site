// Reusable page builder for menu pages, applying the same pipeline proven on the
// homepage: render the live page in Chromium, let Elementor JS apply its runtime
// styles, "bake" the computed visual props inline, promote lazy images to real
// src, rewrite URLs root-relative, and emit a clean HTML include + an Astro page.
//
// Usage: node tools/build-page.mjs <slug> <Page Title>
//   e.g. node tools/build-page.mjs advertisers "For Advertisers - Affiliate Dragons"
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = "https://affdragons.com";
const slug = process.argv[2];
const title = process.argv[3] || slug;
const active = process.argv[4] || ""; // nav item to highlight (e.g. "cooperation")
if (!slug) {
  console.error("usage: node tools/build-page.mjs <slug> <title> [activeNavKey]");
  process.exit(1);
}
const url = `${ROOT}/${slug}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
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

// Bake computed visual props (same property set used for the homepage).
const out = await page.evaluate(() => {
  const PROPS = [
    "color", "background-color", "background-image", "background-position",
    "background-size", "background-repeat", "border-radius",
    "border-top-left-radius", "border-top-right-radius",
    "border-bottom-left-radius", "border-bottom-right-radius",
    // typography Elementor sets per-element (e.g. form labels 17px/500) that
    // isn't in the shared bundle — bake it so text size/weight matches 1:1.
    "font-size", "font-weight", "line-height",
  ];
  const BTN = ["padding", "border", "text-align", "font-weight", "display"];
  const sel =
    "h1,h2,h3,h4,h5,h6,p,span,a,li,label,.elementor-field-label,.elementor-field-group,.elementor-section,.elementor-column,.elementor-widget-wrap,.elementor-button,.jet-button__instance,.jet-button__state,.jet-button__label,.jet-testimonials__item,.jet-testimonials__comment,.jet-testimonials__name,.jet-testimonials__position";
  document.querySelectorAll(sel).forEach((el) => {
    const cs = getComputedStyle(el);
    const isBtn = el.classList.contains("elementor-button") || /\bbtn\b|button|jet-button/i.test(el.className || "");
    let add = "";
    for (const p of isBtn ? [...PROPS, ...BTN] : PROPS) {
      const v = cs.getPropertyValue(p);
      if (!v) continue;
      if (p === "background-color" && (v === "rgba(0, 0, 0, 0)" || v === "transparent")) continue;
      if (p.startsWith("background-") && p !== "background-color" && (v === "none" || v === "auto" || v === "0% 0%" || v === "repeat")) continue;
      add += `${p}:${v};`;
    }
    if (add) {
      const prev = (el.getAttribute("style") || "").trim().replace(/;+$/, "");
      const merged = (prev ? prev + ";" : "") + add;
      // normalise: collapse duplicate/empty semicolons, no leading/trailing ;
      el.setAttribute("style", merged.replace(/;{2,}/g, ";").replace(/^;|;$/g, ""));
    }
  });
  // stamp entrance animations from data-settings (so our runtime can play them)
  document.querySelectorAll(".elementor-widget-image-box,[data-settings]").forEach((el) => {
    const ds = (el.getAttribute("data-settings") || "").replace(/&quot;/g, '"');
    let anim = (ds.match(/"_animation"\s*:\s*"([a-zA-Z]+)"/) || [])[1];
    if (!anim) { const c = [...el.classList].find((x) => /^fadeIn/.test(x)); anim = c || null; }
    if (anim && anim !== "none") {
      const delay = (ds.match(/"_animation_delay"\s*:\s*(\d+)/) || [])[1] || "0";
      el.setAttribute("data-anim", anim);
      el.setAttribute("data-anim-delay", delay);
      el.classList.add("elementor-invisible");
    }
  });
  const cssBundle = (() => {
    const l = document.querySelector('link[rel="stylesheet"][href*="/cache/min/"]');
    return l ? new URL(l.href).pathname : "";
  })();
  const description = (document.querySelector('meta[name="description"]') || {}).content || "";
  return { bodyHtml: document.body.innerHTML, cssBundle, description };
});
await browser.close();

// main = between </header> and <footer>
const he = out.bodyHtml.indexOf("</header>");
const fs2 = out.bodyHtml.indexOf("<footer");
let main = he >= 0 && fs2 > he ? out.bodyHtml.slice(he + 9, fs2) : out.bodyHtml;

// Promote lazy images + fill placeholders from the captured full HTML's URL set.
const capturedFile = `site/raw/${slug}/index.html`;
let urlSet = [];
if (existsSync(capturedFile)) {
  const full = readFileSync(capturedFile, "utf8");
  urlSet = [...new Set([...full.matchAll(/\/wp-content\/uploads\/[^\s"'\\)]+\.(?:png|jpe?g|webp)/gi)].map((m) => m[0]))];
}
function resolveAlt(alt) {
  const norm = alt.trim();
  const dashed = norm.replace(/\s+/g, "-");
  return (
    urlSet.find((u) => { const b = decodeURIComponent(u.split("/").pop()).replace(/\.[a-z]+$/i, ""); return b === norm || b.startsWith(norm); }) ||
    urlSet.find((u) => { const b = decodeURIComponent(u.split("/").pop()).replace(/\.[a-z]+$/i, ""); return b === dashed || b.startsWith(dashed); }) ||
    null
  );
}
main = main.replace(/<img\b[^>]*>/gi, (tag) => {
  // data-lazy-src promotion when src is a placeholder/favicon
  const lazy = tag.match(/data-lazy-src="([^"]+)"/i);
  const cur = (tag.match(/\ssrc="([^"]*)"/i) || [])[1] || "";
  if (lazy && (/favicon|data:image\/svg|data:image\/gif/i.test(cur) || cur === "")) {
    tag = /\ssrc="/i.test(tag) ? tag.replace(/\ssrc="[^"]*"/i, ` src="${lazy[1]}"`) : tag.replace(/^<img/i, `<img src="${lazy[1]}"`);
  }
  // svg placeholder by alt
  if (/data:image\/svg/i.test(tag)) {
    const alt = (tag.match(/alt="([^"]*)"/i) || [])[1] || "";
    const real = resolveAlt(alt);
    if (real) tag = tag.replace(/\ssrc="data:image\/svg[^"]*"/i, ` src="${real}"`);
  }
  return tag;
});

// Clean: root-relative URLs, drop runtime data-* noise (keep style + classes).
function clean(h) {
  h = h.replaceAll(`${ROOT}/wp-content/`, "/wp-content/");
  h = h.replace(new RegExp(`href="${ROOT}/`, "gi"), 'href="/');
  h = h.replaceAll(`href="${ROOT}"`, 'href="/"');
  h = h.replace(/\sdata-(?:e-type|elementor-type|elementor-id|widget_type|element_type|id|settings|negative)="[^"]*"/gi, "");
  h = h.replace(/\ssrcset="\s*"/gi, "");
  return h.trim();
}
main = clean(main);

mkdirSync("src/pages-content", { recursive: true });
writeFileSync(`src/pages-content/${slug}.html`, main);

// Emit the Astro page that wraps this content (reusing Base + SiteHeader + footer).
const astroPath = `src/pages/${slug}.astro`;
const astro = `---
import Base from "../layouts/Base.astro";
import SiteHeader from "../components/SiteHeader.astro";
import mainHtml from "../pages-content/${slug}.html?raw";
import footerHtml from "../footer.html?raw";
const cssBundle = ${JSON.stringify(out.cssBundle || "/wp-content/cache/min/1/15b1474ef970b378f3d5f78749ff522e.css")};
---
<Base title={${JSON.stringify(title)}} description={${JSON.stringify((out.description || "").slice(0, 200))}} cssBundle={cssBundle} inlineCss="/assets/home-inline.css" lang="en" canonical=${JSON.stringify(url)}>
  <SiteHeader slot="header" lang="en"${active ? ` active="${active}"` : ""} />
  <Fragment set:html={mainHtml} />
  <Fragment slot="footer" set:html={footerHtml} />
</Base>
`;
writeFileSync(astroPath, astro);

console.log(`built ${slug}: main ${main.length} bytes, css ${out.cssBundle}`);
console.log(`  -> ${astroPath}`);
console.log(`  placeholders left: ${(main.match(/data:image\/svg/gi) || []).length}`);
