import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const h = readFileSync("src/_home-main.html", "utf8");
const alts = [...h.matchAll(/<img\b[^>]*data:image\/svg[^>]*alt="([^"]+)"[^>]*>/gi)].map((m) => m[1]);

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
const files = walk("public/wp-content/uploads").map((p) =>
  p.replaceAll("\\", "/").replace("public", "")
);

let found = 0,
  miss = 0;
for (const a of alts) {
  const hit = files.find((f) => {
    const b = f.split("/").pop();
    return b.startsWith(a);
  });
  if (hit) found++;
  else {
    miss++;
    console.log("  MISSING for alt:", a);
  }
}
console.log(`testimonial avatars: found ${found} / missing ${miss} (of ${alts.length})`);
