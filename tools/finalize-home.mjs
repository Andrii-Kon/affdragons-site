// Produce the final homepage include from the rendered snapshot:
//  - rewrite absolute affdragons.com URLs to root-relative
//  - keep elementor-* classes (captured CSS targets them) but drop inline
//    lazy/runtime data-* attributes that are no longer needed
//  - leave any remaining placeholder <img> intact (won't break layout)
// Output: src/home-main.html (imported by src/pages/index.astro)
import { readFileSync, writeFileSync } from "node:fs";

let h = readFileSync("tools/_home-rendered-main.html", "utf8");

// root-relative asset + link URLs
h = h.replaceAll("https://affdragons.com/wp-content/", "/wp-content/");
h = h.replace(/href="https:\/\/affdragons\.com\//gi, 'href="/');
h = h.replaceAll('href="https://affdragons.com"', 'href="/"');

// strip runtime data-* noise (keep classes + inline style; CSS relies on them)
h = h.replace(/\sdata-(?:e-type|elementor-type|elementor-id|widget_type|element_type|id|settings|negative)="[^"]*"/gi, "");

// drop empty lazy srcset attrs left behind
h = h.replace(/\ssrcset="\s*"/gi, "");

writeFileSync("src/home-main.html", h.trim());
console.log("wrote src/home-main.html");
console.log("length:", h.length);
console.log("placeholders remaining:", (h.match(/data:image\/svg/gi) || []).length);
console.log("imgs:", (h.match(/<img/gi) || []).length);
console.log("absolute affdragons URLs left:", (h.match(/affdragons\.com/gi) || []).length);
