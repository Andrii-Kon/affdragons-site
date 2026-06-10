import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// What the page requests (decoded) vs what's actually on disk.
const requested = [
  "/wp-content/uploads/2022/10/копія-2.jpg",
  "/wp-content/uploads/2023/07/Дизаин-без-названия.png",
  "/wp-content/uploads/2022/09/accurads.png",
];

for (const r of requested) {
  const local = join("public", decodeURIComponent(r));
  console.log(decodeURIComponent(r), "=> exists:", existsSync(local));
}

// List what IS in the 2022/10 folder so we can see the real on-disk names.
console.log("\nactual files in public/wp-content/uploads/2022/10:");
try {
  readdirSync("public/wp-content/uploads/2022/10")
    .filter((f) => /копія|kopiia|copy|ABC|AW/i.test(f) || /[^\x00-\x7F]/.test(f))
    .slice(0, 20)
    .forEach((f) => console.log("  ", f));
} catch (e) {
  console.log("  (cannot read)", e.message);
}

console.log("\nactual files in public/wp-content/uploads/2022/09 (logos):");
try {
  readdirSync("public/wp-content/uploads/2022/09")
    .filter((f) => /accurads|affplus|logo/i.test(f))
    .slice(0, 20)
    .forEach((f) => console.log("  ", f));
} catch (e) {
  console.log("  (cannot read)", e.message);
}
