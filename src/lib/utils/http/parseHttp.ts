import type { HttpFile, HttpRequest } from "./types.d";

const REQUEST_LINE_RE =
	/^\s*(?<method>GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE|PROPFIND|PROPPATCH|MKCOL|COPY|MOVE|LOCK|UNLOCK|CHECKOUT|CHECKIN|REPORT|MERGE|MKACTIVITY|MKWORKSPACE|VERSION-CONTROL|BASELINE-CONTROL|MKCALENDAR|ACL|SEARCH|GRAPHQL)\s+(?<url>.+?)$/iu;
const HTTP_VERSION_RE = /(?<url>.*)\s+HTTP\/(?<version>\S+)/u;

const URL_ONLY_RE = /^\s*(?<url>https?:\/\/\S+)/u;
const VARIABLE_RE =
	/^\s*@(?<global>global\.)?(?<key>[^\s=:]*)\s*(?<lazy>:?)=\s*"?(?<value>.*?)"?\s*$/u;
const HEADER_RE =
	/^\s*(?<key>[!#$%&'*+\-.^_`|~0-9A-Za-z]+)\s*:\s*(?<value>.*?),?\s*$/u;
const META_RE =
	/^\s*(?:#+|\/{2,})\s+@(?<key>[^\s]*)(?:\s+)?"?(?<value>.*?)"?\s*$/u;
const COMMENT_RE = /^\s*(?:#\s+|#$|\/{2})/u;

/** Try to match a request line (METHOD URL) or bare URL. Returns `{ method, url }` or null. */
function matchRequestLine(
	line: string,
): { method: string; url: string } | null {
	const reqMatch = line.match(REQUEST_LINE_RE);
	if (reqMatch?.groups) {
		let method = reqMatch.groups.method.toUpperCase();
		let rawUrl = reqMatch.groups.url.trim();
		const versionMatch = rawUrl.match(HTTP_VERSION_RE);
		if (versionMatch?.groups) {
			rawUrl = versionMatch.groups.url.trim();
		}
		if (method === "GRAPHQL") method = "POST";
		return { method, url: rawUrl };
	}
	const urlMatch = line.match(URL_ONLY_RE);
	if (urlMatch?.groups) {
		return { method: "GET", url: urlMatch.groups.url };
	}
	return null;
}

/** Replace `{{var}}` placeholders in a URL with their values. */
function resolveVariables(url: string, vars: Record<string, string>): string {
	let resolved = url;
	for (const [k, v] of Object.entries(vars)) {
		resolved = resolved.replaceAll(`{{${k}}}`, v);
	}
	return resolved;
}

/** Try to match a metadata directive (# @key value). Returns { key, value } or null. */
function matchMeta(line: string): { key: string; value: string } | null {
	const m = line.match(META_RE);
	if (!m?.groups) return null;
	const key = m.groups.key.replace(/-./gu, (c) => c[1].toUpperCase());
	return { key, value: m.groups.value?.trim() || "" };
}

/** Try to match a variable definition (@key = value). Returns { key, value } or null. */
function matchVariable(line: string): { key: string; value: string } | null {
	const m = line.match(VARIABLE_RE);
	if (!m?.groups) return null;
	return { key: m.groups.key, value: m.groups.value?.trim() || "" };
}

/** Try to match a header line. Returns { key, value } or null. */
function matchHeader(line: string): { key: string; value: string } | null {
	const m = line.match(HEADER_RE);
	if (!m?.groups) return null;
	return { key: m.groups.key, value: m.groups.value?.trim() || "" };
}

/** Process a single line before the request line has been found. Returns true if the line was consumed. */
function processPreRequestLine(
	line: string,
	allVars: Record<string, string>,
	localVars: Record<string, string>,
): boolean {
	const varResult = matchVariable(line);
	if (varResult) {
		allVars[varResult.key] = varResult.value;
		localVars[varResult.key] = varResult.value;
		return true;
	}
	return false;
}

/** Process a single line after the request line (header or URL continuation). */
function processPostRequestLine(
	rawLine: string,
	line: string,
	headers: Record<string, string>,
): string | null {
	if (/^\s+[/?&]/.test(rawLine)) {
		return line.trim();
	}
	const hdr = matchHeader(line);
	if (hdr) {
		headers[hdr.key] = hdr.value;
	}
	return null;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: HTTP parser loop with inherent branching per line type
function parseRegion(
	content: string,
	title: string | undefined,
	allVars: Record<string, string>,
): HttpRequest | null {
	const lines = content.split("\n");
	let method = "";
	let url = "";
	const headers: Record<string, string> = {};
	const localVars: Record<string, string> = {};
	const meta: Record<string, string> = {};
	const bodyLines: string[] = [];
	let inBody = false;
	let foundRequest = false;
	let name: string | undefined;

	for (const rawLine of lines) {
		const line = rawLine.trimEnd();

		if (inBody) {
			bodyLines.push(rawLine);
			continue;
		}

		const metaResult = matchMeta(line);
		if (metaResult) {
			meta[metaResult.key] = metaResult.value;
			if (metaResult.key === "name") name = metaResult.value;
			continue;
		}

		if (COMMENT_RE.test(line)) continue;

		if (!foundRequest && processPreRequestLine(line, allVars, localVars)) {
			continue;
		}

		if (line.trim() === "") {
			if (foundRequest) inBody = true;
			continue;
		}

		if (!foundRequest) {
			const req = matchRequestLine(line);
			if (req) {
				method = req.method;
				url = req.url;
				foundRequest = true;
				continue;
			}
		}

		if (foundRequest) {
			const urlContinuation = processPostRequestLine(rawLine, line, headers);
			if (urlContinuation !== null) url += urlContinuation;
		}
	}

	if (!foundRequest) return null;

	return {
		method,
		url: resolveVariables(url, allVars),
		headers,
		body: bodyLines.join("\n").trim(),
		name: name ?? title,
		title,
		variables: localVars,
		meta,
	};
}

interface Region {
	title?: string;
	content: string;
	isGlobal: boolean;
}

/** Split source into regions delimited by `###` separator lines. */
function splitRegions(source: string): Region[] {
	const blocks = source.split(/^(###.*)$/m);
	const regions: Region[] = [];

	if (blocks[0].trim()) {
		regions.push({ content: blocks[0], isGlobal: true });
	}
	for (let i = 1; i < blocks.length; i += 2) {
		const sep = blocks[i] || "";
		const title = sep.replace(/^#{3,}\s*/, "").trim() || undefined;
		const content = blocks[i + 1] || "";
		regions.push({ title, content, isGlobal: false });
	}

	return regions;
}

/** Copy newly-added keys from `allVars` (compared to `snapshot`) into `target`. */
function collectNewVars(
	allVars: Record<string, string>,
	snapshot: Record<string, string>,
	target: Record<string, string>,
): void {
	for (const k of Object.keys(allVars)) {
		if (!(k in snapshot)) target[k] = allVars[k];
	}
}

/**
 * Parse an .http/.rest file following the httpyac / RFC 9110 format.
 *
 * Regions are separated by `###` lines. A region without a request line
 * is a "global region" — its variables apply to all subsequent requests.
 */
export function parseHttpFile(source: string): HttpFile {
	const globalVars: Record<string, string> = {};
	const allVars: Record<string, string> = {};
	const requests: HttpRequest[] = [];
	const regions = splitRegions(source);

	for (const region of regions) {
		const varsBefore = { ...allVars };
		const parsed = parseRegion(region.content, region.title, allVars);

		if (region.isGlobal) {
			collectNewVars(allVars, varsBefore, globalVars);
			if (parsed) {
				parsed.variables = {};
				requests.push(parsed);
			}
		} else if (parsed) {
			requests.push(parsed);
		} else {
			collectNewVars(allVars, varsBefore, globalVars);
		}
	}

	return { variables: globalVars, requests };
}
