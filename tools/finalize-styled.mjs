// Finalize the styled (baked-in) homepage snapshot into the Astro includes.
// Keeps the inline style="" attributes (the whole point), root-relativises URLs,
// removes runtime data-* noise that is no longer needed.
import { readFileSync, writeFileSync } from "node:fs";

function clean(h) {
  h = h.replaceAll("https://affdragons.com/wp-content/", "/wp-content/");
  h = h.replace(/href="https:\/\/affdragons\.com\//gi, 'href="/');
  h = h.replaceAll('href="https://affdragons.com"', 'href="/"');
  // strip runtime data-* (settings/ids) but DO NOT touch style=""
  h = h.replace(/\sdata-(?:e-type|elementor-type|elementor-id|widget_type|element_type|id|settings|negative)="[^"]*"/gi, "");
  h = h.replace(/\ssrcset="\s*"/gi, "");
  return h.trim();
}

writeFileSync("src/home-main.html", clean(readFileSync("tools/_home-styled-main.html", "utf8")));
writeFileSync("src/footer.html", clean(readFileSync("tools/_home-styled-footer.html", "utf8")));

const m = readFileSync("src/home-main.html", "utf8");
console.log("home-main bytes:", m.length);
console.log("inline style= kept:", (m.match(/ style="/g) || []).length);
console.log("absolute affdragons urls:", (m.match(/affdragons\.com/gi) || []).length);
