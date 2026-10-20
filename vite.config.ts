import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const api = `http://localhost:${process.env.OMGP_PORT ?? 4747}`;

export default defineConfig({
  root: "web",
  // relative asset URLs: the same build works at / (omgp serve) and under a sub-path (static export)
  base: "./",
  plugins: [svelte()],
  build: { outDir: "../dist/web", emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  server: {
    port: 5173,
    proxy: { "/api": api, "/files": api, "/__omgp": api },
  },
});
