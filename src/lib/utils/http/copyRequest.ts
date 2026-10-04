import {
	Kind,
	type OperationDefinitionNode,
	parse,
	type TypeNode,
	valueFromASTUntyped,
} from "graphql";
import { isMimeTypeJSON } from "httpsnippet/dist/helpers/headers.js";
import { fetch as browserFetch } from "httpsnippet/dist/targets/javascript/fetch/client.js";
import { fetch as nodeFetch } from "httpsnippet/dist/targets/node/fetch/client.js";
import { curl } from "httpsnippet/dist/targets/shell/curl/client.js";
import type { HarEntry } from "@/lib/utils/har";
import type { HttpRequest } from "./types.d";
import { applyVariables, resolveScope } from "./variables";

export interface CopyableRequest {
	method: string;
	url: string;
	headers: Record<string, string>;
	body: string;
}

const GRAPHQL_OPERATIONS = new Set(["QUERY", "MUTATION", "SUBSCRIPTION"]);

function headerName(
	headers: Record<string, string>,
	name: string,
): string | undefined {
	const target = name.toLowerCase();
	return Object.keys(headers).find((key) => key.toLowerCase() === target);
}

function httpMethod(method: string): string {
	const upper = method.toUpperCase();
	if (
		GRAPHQL_OPERATIONS.has(upper) ||
		upper === "FRAGMENT" ||
		upper === "SCHEMA" ||
		upper === "EXTEND"
	) {
		return "POST";
	}
	return upper || "GET";
}

function scopeFor(
	request: HttpRequest,
	fileVariables: Record<string, string>,
): Record<string, string> {
	if (request.variableScope) {
		return resolveScope({
			...request.variableScope,
			...request.variables,
		});
	}
	return resolveScope({ ...fileVariables, ...request.variables });
}

function namedType(type: TypeNode): { name: string; list: boolean } {
	if (type.kind === Kind.NON_NULL_TYPE) return namedType(type.type);
	if (type.kind === Kind.LIST_TYPE) {
		const inner = namedType(type.type);
		return { name: inner.name, list: true };
	}
	return { name: type.name.value, list: false };
}

function coerceValue(raw: string, type: TypeNode): unknown {
	const { name, list } = namedType(type);
	if (list) {
		try {
			return JSON.parse(raw);
		} catch {
			return raw;
		}
	}
	if (name === "Int") {
		const parsed = Number.parseInt(raw, 10);
		return Number.isNaN(parsed) ? raw : parsed;
	}
	if (name === "Float") {
		const parsed = Number.parseFloat(raw);
		return Number.isFinite(parsed) ? parsed : raw;
	}
	if (name === "Boolean") {
		if (raw === "true") return true;
		if (raw === "false") return false;
	}
	if (
		name !== "String" &&
		name !== "ID" &&
		(raw.startsWith("{") || raw.startsWith("["))
	) {
		try {
			return JSON.parse(raw);
		} catch {
			return raw;
		}
	}
	if (raw === "null" && name !== "String" && name !== "ID") return null;
	return raw;
}

function operationVariables(
	query: string,
	scope: Record<string, string>,
): Record<string, unknown> | undefined {
	let operation: OperationDefinitionNode | undefined;
	try {
		for (const node of parse(query).definitions) {
			if (node.kind === Kind.OPERATION_DEFINITION) {
				operation = node;
				break;
			}
		}
	} catch {
		return undefined;
	}
	if (!operation?.variableDefinitions?.length) return undefined;
	const variables: Record<string, unknown> = {};
	for (const definition of operation.variableDefinitions) {
		const name = definition.variable.name.value;
		if (name in scope) {
			variables[name] = coerceValue(scope[name] ?? "", definition.type);
		} else if (definition.defaultValue) {
			variables[name] = valueFromASTUntyped(definition.defaultValue);
		}
	}
	return Object.keys(variables).length > 0 ? variables : undefined;
}

function graphqlBody(
	request: HttpRequest,
	query: string,
	scope: Record<string, string>,
): string {
	const payload: {
		query: string;
		operationName?: string;
		variables?: Record<string, unknown>;
	} = { query };
	if (request.name && request.method.toUpperCase() !== "FRAGMENT") {
		payload.operationName = request.name;
	}
	const variables = operationVariables(query, scope);
	if (variables) payload.variables = variables;
	return JSON.stringify(payload);
}

export function fromHttpRequest(
	request: HttpRequest,
	fileVariables: Record<string, string> = {},
): CopyableRequest {
	const scope = scopeFor(request, fileVariables);
	const headers: Record<string, string> = {};
	for (const [name, value] of Object.entries(request.headers)) {
		headers[applyVariables(name, scope)] = applyVariables(value, scope);
	}
	const method = httpMethod(request.method);
	let body = applyVariables(request.body, scope);
	if (GRAPHQL_OPERATIONS.has(request.method.toUpperCase())) {
		body = graphqlBody(request, body, scope);
		if (!headerName(headers, "content-type")) {
			headers["content-type"] = "application/json";
		}
	}
	return {
		method,
		url: applyVariables(request.url, scope),
		headers,
		body,
	};
}

export function fromHarEntry(entry: HarEntry): CopyableRequest {
	const headers: Record<string, string> = {};
	for (const header of entry.requestHeaders) {
		if (header.name.startsWith(":")) continue;
		headers[header.name] = header.value;
	}
	if (!headerName(headers, "cookie") && entry.requestCookies.length > 0) {
		headers.Cookie = entry.requestCookies
			.map((cookie) => `${cookie.name}=${cookie.value}`)
			.join("; ");
	}
	return {
		method: entry.method || "GET",
		url: entry.url,
		headers,
		body: entry.postData ?? "",
	};
}

function sendsBody(method: string, body: string): boolean {
	return body.length > 0 && method !== "GET" && method !== "HEAD";
}

function snippetInput(request: CopyableRequest) {
	const headersObj = { ...request.headers };
	const body = sendsBody(request.method, request.body) ? request.body : "";
	const typeName = headerName(headersObj, "content-type");
	const declared = typeName ? (headersObj[typeName] ?? "") : "";
	let mimeType = declared.split(";")[0]?.trim() ?? "";
	let jsonObj: unknown;
	if (body && isMimeTypeJSON(mimeType)) {
		try {
			jsonObj = JSON.parse(body);
			mimeType = "application/json";
		} catch {
			mimeType = "text/plain";
		}
	} else if (body && !mimeType) {
		mimeType = "text/plain";
	} else if (!mimeType) {
		mimeType = "application/octet-stream";
	}
	return {
		method: request.method || "GET",
		fullUrl: request.url,
		httpVersion: "HTTP/1.1",
		headersObj,
		allHeaders: { ...headersObj },
		cookies: [] as { name: string; value: string }[],
		postData: {
			mimeType,
			text: body,
			jsonObj,
		},
	} as unknown as Parameters<typeof curl.convert>[0];
}

function cmdQuote(value: string): string {
	const escaped = value
		.replaceAll("^", "^^")
		.replaceAll('"', '\\"')
		.replaceAll("%", "%%")
		.replaceAll("\r\n", " ")
		.replaceAll("\n", " ");
	return `"${escaped}"`;
}

function readBashString(
	source: string,
	start: number,
): { value: string; end: number } {
	let index = start + 1;
	let value = "";
	while (index < source.length) {
		if (source.startsWith("'\\''", index)) {
			value += "'";
			index += 4;
			continue;
		}
		if (source[index] === "'") return { value, end: index };
		value += source[index] ?? "";
		index += 1;
	}
	return { value, end: index };
}

function quoteCmdTokens(segment: string): string {
	return segment.replaceAll(/[^\s]+/gu, (token) => {
		if (token === "^" || !/[%^&|<>]/u.test(token)) return token;
		return cmdQuote(token);
	});
}

/** httpsnippet's curl client emits bash quoting. Adapt that text for cmd.exe. */
function bashCurlToCmd(source: string): string {
	let quoted = "";
	for (let index = 0; index < source.length; index += 1) {
		if (source[index] !== "'") {
			quoted += source[index] ?? "";
			continue;
		}
		const piece = readBashString(source, index);
		quoted += cmdQuote(piece.value);
		index = piece.end;
	}
	const continued = quoted.replaceAll(" \\\n", " ^\n");
	let out = "";
	let cursor = 0;
	while (cursor < continued.length) {
		if (continued[cursor] !== '"') {
			const start = cursor;
			while (cursor < continued.length && continued[cursor] !== '"') {
				cursor += 1;
			}
			out += quoteCmdTokens(continued.slice(start, cursor));
			continue;
		}
		const start = cursor;
		cursor += 1;
		while (cursor < continued.length) {
			if (continued[cursor] === "\\" && continued[cursor + 1] === '"') {
				cursor += 2;
				continue;
			}
			if (continued[cursor] === '"') {
				cursor += 1;
				break;
			}
			cursor += 1;
		}
		out += continued.slice(start, cursor);
	}
	return out;
}

export function toFetch(request: CopyableRequest, node: boolean): string {
	const input = snippetInput(request);
	if (node) return nodeFetch.convert(input);
	// The fetch client's option type says `credentials` is a header map.
	// The generator assigns the value through, and `"include"` is the Fetch API mode.
	return browserFetch.convert(input, {
		credentials: "include",
	} as unknown as Parameters<typeof browserFetch.convert>[1]);
}

export function toCurl(
	request: CopyableRequest,
	shell: "bash" | "cmd",
): string {
	const snippet = curl.convert(snippetInput(request));
	return shell === "cmd" ? bashCurlToCmd(snippet) : snippet;
}
