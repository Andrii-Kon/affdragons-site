// Elementor stores entrance animations in data-settings (e.g. {"_animation":
// "fadeInRight","_animation_delay":200}). Its JS reads these, adds the animation
// class, and plays it on scroll. We're static, so: read data-settings, stamp the
// animation name + delay as data attributes on the element, and leave the
// reveal/playing to a small scroll-trigger script (assets/animations.js).
import { readFileSync, writeFileSync } from "node:fs";

let h = readFileSync("src/home-main.html", "utf8");
let applied = 0;

h = h.replace(/<(div|section)\b[^>]*\bdata-settings="([^"]*)"[^>]*>/gi, (tag) => {
  // decode the HTML-escaped JSON in data-settings
  const dsRaw = (tag.match(/data-settings="([^"]*)"/i) || [])[1] || "";
  const ds = dsRaw.replace(/&quot;/g, '"').replace(/&#039;/g, "'");
  const anim = (ds.match(/"_animation"\s*:\s*"([a-zA-Z]+)"/) || [])[1];
  if (!anim || anim === "none") return tag;
  const delay = (ds.match(/"_animation_delay"\s*:\s*(\d+)/) || [])[1] || "0";
  applied++;
  // add data-anim / data-anim-delay so the runtime can play it; also ensure the
  // element starts hidden via the elementor-invisible class (kept for parity).
  let t = tag.replace(/^<(div|section)/i, `<$1 data-anim="${anim}" data-anim-delay="${delay}"`);
  if (!/elementor-invisible/.test(t)) {
    t = t.replace(/class="([^"]*)"/i, 'class="$1 elementor-invisible"');
  }
  return t;
});

// Also handle the top-row boxes that already carry the class directly
// (animated fadeInLeft) — give them data-anim so the runtime treats them the same.
h = h.replace(/<(div|section)\b[^>]*class="[^"]*\bfadeIn(Left|Right|Up|Down)\b[^"]*"[^>]*>/gi, (tag) => {
  if (/data-anim=/.test(tag)) return tag;
  const dir = (tag.match(/\bfadeIn(Left|Right|Up|Down)\b/) || [])[0];
  return tag.replace(/^<(div|section)/i, `<$1 data-anim="${dir}" data-anim-delay="0"`);
});

writeFileSync("src/home-main.html", h);
console.log("animations stamped (from data-settings):", applied);
console.log("total data-anim elements:", (h.match(/data-anim="/g) || []).length);
