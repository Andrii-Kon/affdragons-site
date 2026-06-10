// The original homepage carries ~46KB of inline <style> in <head> (Elementor
// per-page CSS: heading colours, hero spacing, the pink button, etc.). The
// shared bundle alone is not enough — without these the headings render black
// and spacing breaks. Extract them into one stylesheet we can attach.
import { readFileSync, writeFileSync } from "node:fs";

const h = readFileSync("site/raw/index.html", "utf8");

// Pull every <style>...</style> block from the document.
const blocks = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);

let css = blocks.join("\n\n");
// Rewrite any absolute asset URLs inside the CSS to root-relative.
css = css.replaceAll("https://affdragons.com/wp-content/", "/wp-content/");

writeFileSync("public/assets/home-inline.css", css);
console.log("blocks:", blocks.length, "| bytes:", css.length);
console.log("white-color rules:", (css.match(/color:\s*#fff|color:\s*#ffffff|color:\s*white/gi) || []).length);
