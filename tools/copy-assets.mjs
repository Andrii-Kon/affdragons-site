// Copy the captured wp-content tree (css, images, fonts) into public/ so Astro
// serves them at the same paths the rebuilt pages reference.
import { readdirSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const src = "site/raw/wp-content";
if (!existsSync(src)) {
  console.error("source not found:", src);
  process.exit(1);
}

const files = walk(src);
let copied = 0;
for (const s of files) {
  // map site/raw/wp-content/... -> public/wp-content/...
  const rel = s.replaceAll("\\", "/").replace("site/raw/", "");
  const dest = join("public", rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(s, dest);
  copied++;
}
console.log(`copied ${copied} files into public/wp-content`);
