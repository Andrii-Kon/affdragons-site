// Read the entrance-animation settings straight from the live original (since
// data-settings was stripped from our cleaned markup), then stamp matching
// data-anim/data-anim-delay onto the corresponding widgets in home-main.html by
// order. A small runtime (assets/animations.js) plays them on scroll, exactly
// like Elementor did. This is the firm's own site being migrated.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

// 1) Collect animations from the original, per image-box widget, in document order.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://affdragons.com/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(800);
const anims = await page.evaluate(() => {
  const widgets = [...document.querySelectorAll(".elementor-widget-image-box")];
  return widgets.map((el) => {
    const ds = (el.getAttribute("data-settings") || "").replace(/&quot;/g, '"');
    let anim = (ds.match(/"_animation"\s*:\s*"([a-zA-Z]+)"/) || [])[1];
    const delay = (ds.match(/"_animation_delay"\s*:\s*(\d+)/) || [])[1] || "0";
    // top-row boxes carry the class directly instead of data-settings
    if (!anim) {
      const cls = [...el.classList].find((c) => /^fadeIn/.test(c));
      anim = cls || null;
    }
    return { anim, delay };
  });
});
await browser.close();
console.log("animations found on original (in order):");
anims.forEach((a, i) => console.log(`  ${i}: ${a.anim} delay=${a.delay}`));

// 2) Stamp them onto our markup's image-box widgets, in the same order.
let h = readFileSync("src/home-main.html", "utf8");
let idx = 0;
h = h.replace(/<div\b[^>]*class="[^"]*elementor-widget-image-box[^"]*"[^>]*>/gi, (tag) => {
  const a = anims[idx++];
  if (!a || !a.anim || a.anim === "none") return tag;
  if (/data-anim=/.test(tag)) return tag;
  let t = tag.replace(/^<div/i, `<div data-anim="${a.anim}" data-anim-delay="${a.delay}"`);
  if (!/elementor-invisible/.test(t)) t = t.replace(/class="([^"]*)"/i, 'class="$1 elementor-invisible"');
  return t;
});
writeFileSync("src/home-main.html", h);
console.log("\nstamped onto markup:", (h.match(/data-anim="/g) || []).length, "widgets");
