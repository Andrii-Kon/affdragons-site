// Many images on the original use a JS lazy-loader: the real URL sits in
// data-lazy-src / data-lazy-srcset while the visible src is a placeholder
// (often the favicon). With no lazy-loader JS, promote data-lazy-src to src
// so the real illustrations/icons show. Runs on the built home-main.html.
import { readFileSync, writeFileSync } from "node:fs";

let h = readFileSync("src/home-main.html", "utf8");
let promoted = 0;

h = h.replace(/<img\b[^>]*>/gi, (tag) => {
  const lazy = tag.match(/data-lazy-src="([^"]+)"/i);
  if (!lazy) return tag;
  const real = lazy[1];
  // Only replace when current src is a placeholder (favicon) or a data: URI.
  const curSrc = (tag.match(/\ssrc="([^"]*)"/i) || [])[1] || "";
  const isPlaceholder = /favicon|data:image\/svg|data:image\/gif/i.test(curSrc) || curSrc === "";
  if (!isPlaceholder) return tag;
  promoted++;
  if (/\ssrc="/i.test(tag)) tag = tag.replace(/\ssrc="[^"]*"/i, ` src="${real}"`);
  else tag = tag.replace(/^<img/i, `<img src="${real}"`);
  // also promote srcset if a lazy one exists
  const lazySet = tag.match(/data-lazy-srcset="([^"]+)"/i);
  if (lazySet) {
    if (/\ssrcset="/i.test(tag)) tag = tag.replace(/\ssrcset="[^"]*"/i, ` srcset="${lazySet[1]}"`);
    else tag = tag.replace(/^<img/i, `<img srcset="${lazySet[1]}"`);
  }
  return tag;
});

writeFileSync("src/home-main.html", h);
console.log("promoted lazy-src images:", promoted);
console.log("remaining favicon-as-src imgs:", (h.match(/<img[^>]+src="[^"]*favicon[^"]*"/gi) || []).length);
