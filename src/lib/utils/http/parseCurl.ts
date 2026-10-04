import type { HttpFile, HttpRequest } from "./types.d";

const SKIP_WITH_ARG = new Set([
	"o",
	"w",
	"m",
	"x",
	"e",
	"output",
	"write-out",
	"max-time",
	"proxy",
	"referer",
	"connect-timeout",
]);

const ARG_FLAGS = new Set([
	"X",
	"H",
	"d",
	"u",
	"A",
	"request",
	"header",
	"data",
	"data-raw",
	"data-binary",
	"data-urlencode",
	"user",
	"user-agent",
	"url",
]);

function basicAuth(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return `Basic ${btoa(binary)}`;
}

function tokenize(source: string): string[] {
	const text = source.replace(/\\\r?\n/g, " ").replace(/\^\r?\n/g, " ");
	const tokens: string[] = [];
	let current = "";
	let quote: "'" | '"' | null = null;
	for (let index = 0; index < text.length; index += 1) {
		const char = text[index] ?? "";
		if (quote) {
			if (char === quote) quote = null;
			else if (char === "\\" && quote === '"') {
				index += 1;
				current += text[index] ?? "";
			} else current += char;
			continue;
		}
		if (char === "'" || char === '"') {
			quote = char;
			continue;
		}
		if (char === "\\") {
			index += 1;
			current += text[index] ?? "";
			continue;
		}
		if (/\s/.test(char)) {
			if (current) tokens.push(current);
			current = "";
			continue;
		}
		current += char;
	}
	if (current) tokens.push(current);
	return tokens;
}

function flagName(token: string): { name: string; inline: string } | null {
	if (!token.startsWith("-") || token === "-") return null;
	const long = token.startsWith("--");
	const body = token.replace(/^-+/, "");
	const equals = body.indexOf("=");
	if (equals >= 0) {
		return { name: body.slice(0, equals), inline: body.slice(equals + 1) };
	}
	if (!long && body.length > 1 && ARG_FLAGS.has(body[0] ?? "")) {
		return { name: body[0] ?? "", inline: body.slice(1) };
	}
	return { name: body, inline: "" };
}

interface CurlDraft {
	method: string;
	url: string;
	headers: Record<string, string>;
	body: string;
}

function emptyDraft(): CurlDraft {
	return { method: "GET", url: "", headers: {}, body: "" };
}

function applyFlag(draft: CurlDraft, name: string, value: string) {
	if (name === "X" || name === "request") draft.method = value.toUpperCase();
	else if (name === "H" || name === "header") {
		const split = value.indexOf(":");
		if (split >= 0) {
			draft.headers[value.slice(0, split).trim()] = value
				.slice(split + 1)
				.trim();
		}
	} else if (
		name === "d" ||
		name === "data" ||
		name === "data-raw" ||
		name === "data-binary" ||
		name === "data-urlencode"
	) {
		draft.body = draft.body ? `${draft.body}&${value}` : value;
		if (draft.method === "GET") draft.method = "POST";
	} else if (name === "u" || name === "user") {
		draft.headers.Authorization = basicAuth(value);
	} else if (name === "A" || name === "user-agent") {
		draft.headers["User-Agent"] = value;
	} else if (name === "url") draft.url = value;
}

function draftToRequest(draft: CurlDraft): HttpRequest | null {
	if (!draft.url) return null;
	return {
		method: draft.method,
		url: draft.url,
		headers: draft.headers,
		body: draft.body,
		variables: {},
		meta: {},
	};
}

function consumeCurlFlag(
	draft: CurlDraft,
	tokens: string[],
	at: { index: number; token: string },
): number {
	const flag = flagName(at.token);
	if (!flag) {
		if (!draft.url) draft.url = at.token;
		return at.index;
	}
	if (SKIP_WITH_ARG.has(flag.name)) {
		return flag.inline ? at.index : at.index + 1;
	}
	if (!ARG_FLAGS.has(flag.name)) return at.index;
	const value = flag.inline ? flag.inline : (tokens[at.index + 1] ?? "");
	applyFlag(draft, flag.name, value);
	return flag.inline ? at.index : at.index + 1;
}

function collectCurlRequests(tokens: string[]): HttpRequest[] {
	const requests: HttpRequest[] = [];
	let draft = emptyDraft();
	let active = false;
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index] ?? "";
		if (token === "curl") {
			const request = active ? draftToRequest(draft) : null;
			if (request) requests.push(request);
			draft = emptyDraft();
			active = true;
			continue;
		}
		if (!active || token.startsWith("#")) continue;
		index = consumeCurlFlag(draft, tokens, { index, token });
	}
	const request = active ? draftToRequest(draft) : null;
	if (request) requests.push(request);
	return requests;
}

export function parseCurlFile(source: string): HttpFile {
	return { variables: {}, requests: collectCurlRequests(tokenize(source)) };
}
