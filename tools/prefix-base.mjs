// Post-build: rewrite root-absolute asset/link paths in the built HTML so they
// resolve under the GitHub Pages project base (e.g. /affdragons-site/).
// Source files keep clean root paths (/wp-content, /assets, /...); only the
// built output in dist/ is prefixed. Set PUBLIC_BASE=/ to disable (custom domain).
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const base = (process.env.PUBLIC_BASE ?? "/affdragons-site/").replace(/\/+$/, "") + "/";
if (base === "/") {
  console.log("base is '/', nothing to prefix.");
  process.exit(0);
}

const DIST = "dist";

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const prefix = base.slice(0, -1); // e.g. "/affdragons-site"
let changed = 0;

for (const file of walk(DIST)) {
  if (!/\.(html|css)$/i.test(file)) continue;
  let s = readFileSync(file, "utf8");
  const before = s;

  if (file.endsWith(".html")) {
    // attribute paths: href="/..", src="/..", srcset entries, and the link in
    // content; skip protocol-relative (//) and already-prefixed paths.
    s = s.replace(/(href|src)="\/(?!\/)/g, `$1="${prefix}/`);
    s = s.replace(/(srcset|data-lazy-srcset)="([^"]*)"/gi, (m, attr, val) => {
      const fixed = val.replace(/(^|,\s*)\/(?!\/)/g, `$1${prefix}/`);
      return `${attr}="${fixed}"`;
    });
  } else {
    // CSS url(/...) references
    s = s.replace(/url\(\s*\/(?!\/)/g, `url(${prefix}/`);
  }

  // Avoid double-prefixing if a path already contains the base.
  s = s.split(`${prefix}${prefix}`).join(prefix);

  if (s !== before) {
    writeFileSync(file, s);
    changed++;
  }
}

console.log(`prefixed ${changed} files with base "${prefix}/"`);
