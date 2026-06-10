// Cleans the captured homepage main-content HTML for reuse in the static rebuild:
//  - swaps lazy-load SVG placeholders for the real image (data-src -> src)
//  - rewrites absolute affdragons.com asset URLs to root-relative
//  - drops Elementor's inline lazy/animation noise attributes but KEEPS classes
//    (the captured CSS bundle targets those classes, so the look is preserved)
// Output: src/_home-main.html (an include used by src/pages/index.astro)
import { readFileSync, writeFileSync } from "node:fs";

let h = readFileSync("tools/_home-main.html", "utf8");

// 1) Promote real images: when an <img> has data-src pointing at a real upload,
//    set src to it and remove the inline data: placeholder.
h = h.replace(/<img\b[^>]*>/gi, (tag) => {
  const dataSrc = tag.match(/data-src="(https:\/\/affdragons\.com\/wp-content\/uploads\/[^"]+)"/i);
  if (dataSrc) {
    tag = tag.replace(/\ssrc="data:image\/svg[^"]*"/i, "");
    tag = tag.replace(/\sdata-src="[^"]*"/i, "");
    // insert a clean src right after <img
    tag = tag.replace(/^<img/i, `<img src="${dataSrc[1]}"`);
  }
  // same for data-srcset / srcset placeholders
  tag = tag.replace(/\sdata-srcset="([^"]*)"/i, ' srcset="$1"');
  return tag;
});

// 2) Rewrite absolute URLs to root-relative so they resolve on the new host.
h = h.replaceAll("https://affdragons.com/wp-content/", "/wp-content/");
// internal page links -> root-relative (keep them working in the static site)
h = h.replace(/href="https:\/\/affdragons\.com\//gi, 'href="/');

// 3) Remove noisy inline lazy attributes Elementor adds (keep classes/styles).
h = h.replace(/\sdata-(?:lazy-type|lazy-src|widget_type|element_type|id|settings)="[^"]*"/gi, "");

writeFileSync("src/_home-main.html", h.trim());
console.log("cleaned home main written to src/_home-main.html");
console.log("length:", h.length);
console.log("remaining data:svg placeholders:", (h.match(/data:image\/svg/gi) || []).length);
console.log("real <img src=/wp-content> now:", (h.match(/<img[^>]+src="\/wp-content/gi) || []).length);
