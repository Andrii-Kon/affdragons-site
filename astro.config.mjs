import { defineConfig } from "astro/config";

// Static build of the rebuilt affdragons.com (off WordPress/Elementor).
export default defineConfig({
  site: "https://affdragons.com",
  build: { format: "directory" },
});
