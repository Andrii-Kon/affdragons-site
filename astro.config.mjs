import { defineConfig } from "astro/config";

// Static build of the rebuilt affdragons.com (off WordPress/Elementor).
// Hosted under a GitHub Pages project path (andrii-kon.github.io/affdragons-site).
// `base` is overridable via env so a future custom-domain deploy can set "/".
const base = process.env.PUBLIC_BASE ?? "/affdragons-site/";

export default defineConfig({
  site: "https://andrii-kon.github.io",
  base,
  build: { format: "directory" },
});
