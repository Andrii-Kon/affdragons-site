// Clean the captured footer into a reusable include (src/footer.html):
// root-relative URLs, drop runtime data-* noise, keep classes for CSS.
import { readFileSync, writeFileSync } from "node:fs";

let h = readFileSync("tools/_home-rendered-footer.html", "utf8");
h = h.replaceAll("https://affdragons.com/wp-content/", "/wp-content/");
h = h.replace(/href="https:\/\/affdragons\.com\//gi, 'href="/');
h = h.replaceAll('href="https://affdragons.com"', 'href="/"');
h = h.replace(/\sdata-(?:e-type|elementor-type|elementor-id|widget_type|element_type|id|settings)="[^"]*"/gi, "");

writeFileSync("src/footer.html", h.trim());
console.log("wrote src/footer.html, length:", h.length);
console.log("placeholders:", (h.match(/data:image\/svg/gi) || []).length, "| imgs:", (h.match(/<img/gi) || []).length);
