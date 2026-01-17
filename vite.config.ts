import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import { comlink } from "vite-plugin-comlink";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [comlink(), reactRouter(), tsconfigPaths()],
  worker: {
    plugins: () => [comlink()],
  },
  optimizeDeps: {},
});
