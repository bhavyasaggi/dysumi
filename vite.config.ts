import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import babel from "@rolldown/plugin-babel";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { comlink } from "vite-plugin-comlink";

const nodePathShim = fileURLToPath(
	new URL("./src/lib/shims/node-path.ts", import.meta.url),
);

function clientNodeShims(): Plugin {
	return {
		name: "client-node-shims",
		enforce: "pre",
		resolveId(source, _importer, options) {
			if (options?.ssr) return null;
			if (source === "path") return nodePathShim;
			if (source === "fs") return "\0fs-browser-stub";
			return null;
		},
		load(id) {
			if (id !== "\0fs-browser-stub") return null;
			return "const fs = {}; export default fs;";
		},
	};
}

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
	plugins: [
		babel({ presets: [reactCompilerPreset()] }),
		clientNodeShims(),
		comlink(),
		reactRouter(),
	],
	worker: {
		plugins: () => [comlink()],
	},
	optimizeDeps: {
		include: ["react-filerobot-image-editor", "pdfjs-dist"],
	},
	assetsInclude: ["**/*.worker.js", "**/*.worker.mjs"],
});
