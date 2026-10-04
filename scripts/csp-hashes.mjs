import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../build/client/", import.meta.url);

async function htmlFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await htmlFiles(path)));
		} else if (entry.name.endsWith(".html")) {
			files.push(path);
		}
	}
	return files;
}

function inlineHashes(html) {
	const hashes = new Set();
	const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
	for (const match of html.matchAll(pattern)) {
		if (/\bsrc\s*=/i.test(match[1]) || match[2].length === 0) continue;
		const digest = createHash("sha256").update(match[2]).digest("base64");
		hashes.add(`'sha256-${digest}'`);
	}
	return [...hashes];
}

function withHashes(html, hashes) {
	if (hashes.length === 0) return html;
	const addition = hashes
		.map((hash) => ` &#x27;${hash.slice(1, -1)}&#x27;`)
		.join("");
	const token =
		"script-src &#x27;self&#x27; &#x27;wasm-unsafe-eval&#x27; blob:";
	if (!html.includes(token)) {
		throw new Error("Content-Security-Policy script-src was not found");
	}
	if (html.includes(`${token} &#x27;sha256-`)) return html;
	return html.replace(token, `${token}${addition}`);
}

function withFallbackMeta(html, file) {
	if (!file.endsWith("__spa-fallback.html") || html.includes("<title>")) {
		return html;
	}
	const tags = [
		"<title>Page not found · dysumi</title>",
		'<meta name="description" content="That page does not exist.">',
		'<meta name="robots" content="noindex">',
	].join("");
	return html.replace("<head>", `<head>${tags}`);
}

const files = await htmlFiles(root.pathname);
for (const file of files) {
	const html = await readFile(file, "utf8");
	const next = withHashes(withFallbackMeta(html, file), inlineHashes(html));
	if (next !== html) await writeFile(file, next);
}
