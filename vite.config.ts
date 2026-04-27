import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import { comlink } from "vite-plugin-comlink";

export default defineConfig({
	server: {
		host: true,
	},
	build: {
		target: "esnext",
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [comlink(), reactRouter()],
	worker: {
		plugins: () => [comlink()],
	},
	optimizeDeps: {
		include: ["react-filerobot-image-editor", "pdfjs-dist"],
	},
	assetsInclude: ["**/*.worker.js", "**/*.worker.mjs"],
});
