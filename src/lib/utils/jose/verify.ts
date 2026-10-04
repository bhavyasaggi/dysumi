import {
	base64url,
	compactVerify,
	createLocalJWKSet,
	errors,
	importJWK,
	importPKCS8,
	importSPKI,
	importX509,
	type JWK,
} from "jose";
import type { JsonObject, ParsedJws } from "./parse";

export type SecretEncoding = "utf8" | "base64url";
export type KeyFormat = "secret" | "pem" | "jwk";

export type VerifyResult =
	| { state: "unverified" }
	| { state: "unsecured" }
	| { state: "valid" }
	| { state: "invalid"; detail: string }
	| { state: "error"; detail: string };

const PRIVATE_MEMBERS = new Set([
	"d",
	"p",
	"q",
	"dp",
	"dq",
	"qi",
	"priv",
	"oth",
	"k",
]);

function isRecord(value: unknown): value is JsonObject {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// jose only verifies with a public JWK. A pasted private key still checks
// the signature once its private members are removed.
function asVerificationJwk(jwk: JsonObject): JWK {
	const copy: JsonObject = {};
	const keepOps = Array.isArray(jwk.key_ops) && jwk.key_ops.includes("verify");
	for (const [name, value] of Object.entries(jwk)) {
		if (name === "key_ops") continue;
		if (jwk.kty !== "oct" && PRIVATE_MEMBERS.has(name)) continue;
		copy[name] = value;
	}
	if (keepOps && Array.isArray(jwk.key_ops)) copy.key_ops = [...jwk.key_ops];
	return copy as JWK;
}

function critOptions(
	header: JsonObject,
): { crit: Record<string, boolean> } | undefined {
	if (!Array.isArray(header.crit)) return undefined;
	const crit: Record<string, boolean> = {};
	for (const name of header.crit) {
		if (typeof name === "string" && name.length > 0 && name !== "b64") {
			crit[name] = false;
		}
	}
	return Object.keys(crit).length > 0 ? { crit } : undefined;
}

function readJwkJson(material: string): JsonObject {
	let parsed: unknown;
	try {
		parsed = JSON.parse(material);
	} catch {
		throw new Error("The JWK is not valid JSON");
	}
	if (!isRecord(parsed)) throw new Error("The JWK must be a JSON object");
	return parsed;
}

function matchingKey(keys: unknown[], kid: unknown): JsonObject {
	const records = keys.filter(isRecord);
	if (records.length === 0) throw new errors.JWKSNoMatchingKey();
	if (typeof kid === "string") {
		const match = records.find((key) => key.kid === kid);
		if (!match) throw new errors.JWKSNoMatchingKey();
		return match;
	}
	if (records.length === 1) return records[0];
	throw new errors.JWKSMultipleMatchingKeys();
}

function importPem(material: string, alg: string) {
	const trimmed = material.trim();
	if (trimmed.startsWith("-----BEGIN CERTIFICATE-----")) {
		return importX509(trimmed, alg);
	}
	if (trimmed.startsWith("-----BEGIN PRIVATE KEY-----")) {
		return importPKCS8(trimmed, alg);
	}
	if (trimmed.startsWith("-----BEGIN PUBLIC KEY-----")) {
		return importSPKI(trimmed, alg);
	}
	throw new Error(
		"Paste a public key, certificate, PKCS#8 private key, or a JWK",
	);
}

function jwkKey(material: string, alg: string, kid: unknown) {
	const parsed = readJwkJson(material);
	if (!Array.isArray(parsed.keys)) {
		return importJWK(asVerificationJwk(parsed), alg);
	}
	// createLocalJWKSet resolves public signature keys only.
	if (alg.startsWith("HS")) {
		return importJWK(asVerificationJwk(matchingKey(parsed.keys, kid)), alg);
	}
	const keys: JWK[] = [];
	for (const item of parsed.keys) {
		if (!isRecord(item)) throw new Error("The JWK must be a JSON object");
		keys.push(asVerificationJwk(item));
	}
	return createLocalJWKSet({ keys });
}

function resolveKey(
	token: ParsedJws,
	material: string,
	key: { format: KeyFormat; encoding: SecretEncoding },
) {
	const { format, encoding } = key;
	const alg = String(token.header.alg ?? "");
	if (format === "secret") {
		if (!alg.startsWith("HS")) {
			throw new Error(`${alg} uses a public key or JWK, not a shared secret`);
		}
		if (encoding === "utf8") return new TextEncoder().encode(material);
		try {
			return base64url.decode(material.trim());
		} catch {
			throw new Error("The secret is not valid base64url");
		}
	}
	if (format === "pem") {
		if (alg.startsWith("HS")) {
			throw new Error(`${alg} uses a shared secret, not a PEM key`);
		}
		return importPem(material, alg);
	}
	return jwkKey(material, alg, token.header.kid);
}

export async function verifyJws(
	token: ParsedJws,
	material: string,
	key: { format: KeyFormat; encoding: SecretEncoding },
): Promise<VerifyResult> {
	const { format, encoding } = key;
	const alg = typeof token.header.alg === "string" ? token.header.alg : "";
	if (alg === "none") return { state: "unsecured" };
	if (!alg) return { state: "error", detail: "Header has no alg" };
	if (material.trim().length === 0) return { state: "unverified" };
	try {
		const keyMaterial = await resolveKey(token, material, {
			format,
			encoding,
		});
		await compactVerify(token.compact, keyMaterial, critOptions(token.header));
		return { state: "valid" };
	} catch (error) {
		if (error instanceof errors.JWSSignatureVerificationFailed) {
			return {
				state: "invalid",
				detail: "The signature does not match this key",
			};
		}
		const detail =
			error instanceof Error ? error.message : "Could not check the signature";
		return { state: "error", detail };
	}
}
