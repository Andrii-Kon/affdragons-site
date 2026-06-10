import { readdirSync } from "node:fs";
import { join } from "node:path";

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
const files = walk("public/wp-content/uploads").map((p) =>
  p.replaceAll("\\", "/").replace(/^public/, "")
);
const want = ["EVENT", "AW-Conf", "AW_Conf", "Live-Coaching", "LiveCoaching", "Podcast", "richads", "logo-2", "logo_2"];
for (const w of want) {
  const hits = files.filter((f) => f.toLowerCase().includes(w.toLowerCase()));
  console.log(w, "->", hits.length, "hits");
  hits.slice(0, 4).forEach((h) => console.log("     ", h));
}
