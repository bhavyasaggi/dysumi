import { base64url, decodeJwt, decodeProtectedHeader } from "jose";

export interface JsonObject {
	[key: string]: unknown;
}

export interface ParsedJws {
	compact: string;
	header: JsonObject;
	payload: JsonObject | null;
	payloadText: string;
}

export interface ParsedJwe {
	compact: string;
	header: JsonObject;
	encryptedKey: string;
	iv: string;
	ciphertext: string;
	tag: string;
}

export interface JoseJws {
	kind: "jws";
	token: ParsedJws;
	source: string | null;
}

export interface JoseJwe {
	kind: "jwe";
	token: ParsedJwe;
}

export interface JoseJwk {
	kind: "jwk";
	key: JsonObject;
}

export interface JoseJwks {
	kind: "jwks";
	keys: JsonObject[];
}

export interface JoseDiscovery {
	kind: "discovery";
	document: JsonObject;
}

export type JoseDocument =
	| JoseJws
	| JoseJwe
	| JoseJwk
	| JoseJwks
	| JoseDiscovery;

const TOKEN_FIELDS = ["access_token", "id_token", "token", "jwt"];
const PRIVATE_MEMBERS = ["d", "p", "q", "dp", "dq", "qi", "k"];

function isObject(value: unknown): value is JsonObject {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isPrivateKey(jwk: JsonObject): boolean {
	if (jwk.kty === "oct") return typeof jwk.k === "string";
	return PRIVATE_MEMBERS.some(
		(name) => name !== "k" && typeof jwk[name] === "string",
	);
}

function headerProblem(
	kind: "jwe" | "jwt",
	problem: "encoding" | "json",
): string {
	if (kind === "jwe" && problem === "encoding") {
		return "The protected header is not valid base64url";
	}
	if (kind === "jwe") return "The JWE protected header is not a JSON object";
	if (problem === "encoding") return "The header is not valid base64url";
	return "The JWT header is not a JSON object";
}

function protectedHeader(token: string, kind: "jwe" | "jwt"): JsonObject {
	const headerPart = token.split(".")[0] ?? "";
	try {
		base64url.decode(headerPart);
	} catch {
		throw new Error(headerProblem(kind, "encoding"));
	}
	try {
		return decodeProtectedHeader(token);
	} catch {
		throw new Error(headerProblem(kind, "json"));
	}
}

function objectPayload(text: string): JsonObject | null {
	try {
		const parsed: unknown = JSON.parse(text);
		return isObject(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function payloadOf(
	token: string,
	payloadPart: string,
): { payload: JsonObject | null; payloadText: string } {
	if (payloadPart.length === 0) return { payload: null, payloadText: "" };
	let payloadText: string;
	try {
		payloadText = new TextDecoder().decode(base64url.decode(payloadPart));
	} catch {
		throw new Error("The payload is not valid base64url");
	}
	try {
		return { payload: decodeJwt(token), payloadText };
	} catch {
		return { payload: objectPayload(payloadText), payloadText };
	}
}

export function parseCompactJws(compact: string): ParsedJws {
	const token = compact.trim();
	const parts = token.split(".");
	if (parts.length !== 3) {
		throw new Error("A JWT has three base64url parts separated by dots");
	}
	const header = protectedHeader(token, "jwt");
	const { payload, payloadText } = payloadOf(token, parts[1] ?? "");
	return { compact: token, header, payload, payloadText };
}

export function parseCompactJwe(compact: string): ParsedJwe {
	const token = compact.trim();
	const parts = token.split(".");
	if (parts.length !== 5) {
		throw new Error("A JWE has five base64url parts separated by dots");
	}
	const header = protectedHeader(token, "jwe");
	const [, encryptedKey, iv, ciphertext, tag] = parts;
	return {
		compact: token,
		header,
		encryptedKey: encryptedKey ?? "",
		iv: iv ?? "",
		ciphertext: ciphertext ?? "",
		tag: tag ?? "",
	};
}

function extractWrappedToken(
	text: string,
): { token: string; source: string } | null {
	if (!text.startsWith("{")) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return null;
	}
	if (!isObject(parsed)) return null;
	for (const field of TOKEN_FIELDS) {
		const value = parsed[field];
		if (typeof value === "string" && value.includes(".")) {
			return { token: value.trim(), source: field };
		}
	}
	return null;
}

function asKeys(value: unknown): JsonObject[] | null {
	if (!Array.isArray(value)) return null;
	const keys = value.filter(isObject);
	return keys.length === value.length ? keys : null;
}

function parseJsonJose(text: string): JoseDocument {
	const parsed = JSON.parse(text) as unknown;
	const keys = asKeys(parsed);
	if (keys) return { kind: "jwks", keys };
	if (!isObject(parsed)) throw new Error("Expected a JSON object");
	const nested = asKeys(parsed.keys);
	if (nested) return { kind: "jwks", keys: nested };
	if (typeof parsed.kty === "string") return { kind: "jwk", key: parsed };
	if (
		typeof parsed.issuer === "string" ||
		typeof parsed.jwks_uri === "string" ||
		typeof parsed.authorization_endpoint === "string"
	) {
		return { kind: "discovery", document: parsed };
	}
	const wrapped = extractWrappedToken(text);
	if (wrapped) {
		return {
			kind: "jws",
			token: parseCompactJws(wrapped.token),
			source: wrapped.source,
		};
	}
	throw new Error("This JSON file is not a JWK, JWKS, or token");
}

export function parseJose(text: string, extension: string): JoseDocument {
	const trimmed = text.trim();
	if (!trimmed) throw new Error("The file is empty");

	if (
		extension === "jwk" ||
		extension === "jwks" ||
		extension === "well-known"
	) {
		try {
			return parseJsonJose(trimmed);
		} catch (error) {
			if (error instanceof Error && error.message.startsWith("This JSON")) {
				throw error;
			}
			throw new Error("Could not read this file as JSON");
		}
	}

	if (extension === "jwe" || trimmed.split(".").length === 5) {
		return { kind: "jwe", token: parseCompactJwe(trimmed) };
	}

	const wrapped = extractWrappedToken(trimmed);
	if (wrapped) {
		const parts = wrapped.token.split(".");
		if (parts.length === 5) {
			return { kind: "jwe", token: parseCompactJwe(wrapped.token) };
		}
		return {
			kind: "jws",
			token: parseCompactJws(wrapped.token),
			source: wrapped.source,
		};
	}

	return { kind: "jws", token: parseCompactJws(trimmed), source: null };
}
