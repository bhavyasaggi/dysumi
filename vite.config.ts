import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import { comlink } from "vite-plugin-comlink";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    host: true,
  },
  plugins: [comlink(), reactRouter(), tsconfigPaths()],
  worker: {
    plugins: () => [comlink()],
  },
  optimizeDeps: {
    include: ["react-filerobot-image-editor", "pdfjs-dist"],
  },
  // Ensure pdf.js worker is properly handled
  assetsInclude: ["**/*.worker.js", "**/*.worker.mjs"],
});
