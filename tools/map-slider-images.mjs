// Build a mapping from testimonial/partner image alt-text to its real URL by
// scanning the full captured homepage, where JetElements embeds the real upload
// URLs (in noscript fallbacks / data attributes / config), then fill the 33
// placeholder <img> in the rendered main with those real src values.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const full = readFileSync("site/raw/index.html", "utf8");

// Index every uploaded image file we actually have, by basename.
function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
const localFiles = walk("public/wp-content/uploads").map((p) =>
  p.replaceAll("\\", "/").replace(/^public/, "")
);

// All real upload URLs that appear anywhere in the full homepage HTML.
const urls = [
  ...new Set(
    [...full.matchAll(/\/wp-content\/uploads\/[^\s"'\\)]+\.(?:png|jpe?g|webp)/gi)].map((m) =>
      m[0]
    )
  ),
];

// Resolve a placeholder by alt: find a real URL whose filename starts with alt
// (after normalising spaces). Falls back to a local file match.
function resolve(alt) {
  const norm = alt.trim();
  // try exact-ish basename match against captured URLs first
  let hit = urls.find((u) => {
    const base = decodeURIComponent(u.split("/").pop()).replace(/\.[a-z]+$/i, "");
    return base === norm || base.startsWith(norm);
  });
  if (hit) return hit;
  // try with spaces->dashes (WordPress slugifies filenames)
  const dashed = norm.replace(/\s+/g, "-");
  hit = urls.find((u) => {
    const base = decodeURIComponent(u.split("/").pop()).replace(/\.[a-z]+$/i, "");
    return base === dashed || base.startsWith(dashed);
  });
  return hit || null;
}

let main = readFileSync("tools/_home-rendered-main.html", "utf8");
let filled = 0,
  unresolved = [];

main = main.replace(/<img\b[^>]*>/gi, (tag) => {
  if (!/data:image\/svg/i.test(tag)) return tag;
  const alt = (tag.match(/alt="([^"]*)"/i) || [])[1] || "";
  const real = resolve(alt);
  if (real) {
    tag = tag.replace(/\ssrc="data:image\/svg[^"]*"/i, ` src="${real}"`);
    filled++;
  } else {
    unresolved.push(alt);
  }
  return tag;
});

writeFileSync("tools/_home-rendered-main.html", main);
console.log("filled placeholders:", filled);
console.log("still unresolved:", unresolved.length);
unresolved.forEach((a) => console.log("  ?", JSON.stringify(a)));
