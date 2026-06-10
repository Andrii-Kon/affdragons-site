// Batch-builds all English blog posts via the same build-page pipeline.
// Posts are already captured under site/raw/<slug>/index.html, so this reads the
// captured title/description and runs the per-page builder for each.
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = "https://affdragons.com";
const { urls } = JSON.parse(readFileSync("tools/urls.json", "utf8"));

const MENU = new Set([
  "", "advertisers", "partnership", "our-partners", "careers", "events",
  "inhouse-offers", "contact", "sign-up", "terms-for-publishers", "blog",
  "afbrief", "adbrief", "contact-us", "page-thank", "partnership-2",
  "projects", "services", "single-services",
]);
const isOffer = (s) =>
  /-offers-|-offers$|offers-with-prelander|offers-finance|offers-adult|offers-cc-submits/.test(s);

const posts = [];
for (const u of urls) {
  let s = u.replace(`${ROOT}/`, "").replace(/\/$/, "");
  if (!s) continue;
  if (s.startsWith("ru/") || s.startsWith("uk/")) continue; // English only for now
  if (s.startsWith("category/") || s.startsWith("tag/")) continue;
  if (isOffer(s)) continue;
  if (MENU.has(s)) continue;
  posts.push(s);
}

console.log(`English posts to build: ${posts.length}\n`);

let ok = 0, skip = 0, fail = 0;
const failed = [];
const built = [];

for (let i = 0; i < posts.length; i++) {
  const slug = posts[i];
  const captured = `site/raw/${slug}/index.html`;
  if (!existsSync(captured)) {
    skip++;
    failed.push({ slug, reason: "not captured" });
    continue;
  }
  // pull title + description from the captured HTML
  const h = readFileSync(captured, "utf8");
  let title =
    (h.match(/<meta property="og:title" content="([^"]*)"/i) || [])[1] ||
    (h.match(/<title>([^<]*)<\/title>/i) || [])[1] ||
    slug;
  title = title.replace(/&amp;/g, "&").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').trim();

  try {
    // "" active nav, "post" => minimal footer (posts have no big footer)
    execFileSync("node", ["tools/build-page.mjs", slug, title, "", "post"], { stdio: "pipe", timeout: 120000 });
    ok++;
    built.push(slug);
    if (i % 10 === 0) console.log(`[${i + 1}/${posts.length}] ${slug}`);
  } catch (e) {
    fail++;
    failed.push({ slug, reason: (e.message || "").slice(0, 80) });
    console.log(`[${i + 1}/${posts.length}] FAIL ${slug}`);
  }
}

writeFileSync("tools/blog-built.json", JSON.stringify(built, null, 2));
if (failed.length) writeFileSync("tools/blog-failed.json", JSON.stringify(failed, null, 2));
console.log(`\nDONE. built=${ok} skipped=${skip} failed=${fail}`);
