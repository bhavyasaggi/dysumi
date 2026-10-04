import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useState } from "react";
import {
	CLAIM_INFO,
	formatTimestamp,
	isTimeClaim,
	timeState,
} from "@/lib/utils/jose/claims";
import type { JsonObject, ParsedJws } from "@/lib/utils/jose/parse";
import {
	type KeyFormat,
	type SecretEncoding,
	type VerifyResult,
	verifyJws,
} from "@/lib/utils/jose/verify";

export function keyMaterialLabel(format: KeyFormat): string {
	if (format === "secret") return "Shared secret";
	if (format === "pem") return "Public key";
	return "JWK or JWKS";
}

export function keyMaterialPlaceholder(format: KeyFormat): string {
	if (format === "pem") return "-----BEGIN PUBLIC KEY-----";
	if (format === "jwk") return '{"kty":"RSA","n":"…","e":"AQAB"}';
	return "secret";
}

export function pretty(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

export function showValue(value: unknown): string {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean")
		return String(value);
	if (value == null) return "";
	return JSON.stringify(value);
}

export function claimValue(name: string, value: unknown): string {
	if (typeof value === "number" && isTimeClaim(name)) {
		return `${formatTimestamp(value)} · ${value}`;
	}
	return showValue(value);
}

export function toneOf(
	name: string,
	value: unknown,
): "expired" | "pending" | null {
	if (typeof value !== "number" || !isTimeClaim(name)) return null;
	return timeState(name, value);
}

export function shortPart(value: string): string {
	if (value.length <= 36) return value;
	return `${value.slice(0, 18)}…${value.slice(-10)}`;
}

export function objectRows(value: JsonObject) {
	return Object.entries(value).map(([name, raw]) => ({
		name,
		value: claimValue(name, raw),
		hint: CLAIM_INFO[name] ?? "",
		tone: toneOf(name, raw),
	}));
}

export function tokenNote(
	tokenText: string,
	jws: ParsedJws | null,
	result: VerifyResult,
): { text: string; color: string } {
	if (tokenText.trim().split(".").length >= 3 && !jws) {
		return { text: "That text is not a compact JWT", color: "red" };
	}
	if (!jws)
		return {
			text: "Paste a JWT to check it against this key",
			color: "dimmed",
		};
	return verifyDetail(result);
}

export function verifyDetail(result: VerifyResult): {
	text: string;
	color: string;
} {
	if (result.state === "invalid" || result.state === "error") {
		return { text: result.detail, color: "red" };
	}
	if (result.state === "unsecured") {
		return {
			text: "alg is none, so there is no signature to check",
			color: "yellow.7",
		};
	}
	if (result.state === "valid") {
		return { text: "The signature matches this key", color: "teal" };
	}
	return { text: "The signature is checked in this browser", color: "dimmed" };
}

export function tokenTone(
	payload: JsonObject | null,
): "expired" | "pending" | null {
	if (!payload) return null;
	const expired = toneOf("exp", payload.exp);
	if (expired) return expired;
	return toneOf("nbf", payload.nbf);
}

export function useSignature(
	token: ParsedJws | null,
	material: string,
	key: { format: KeyFormat; encoding: SecretEncoding },
): VerifyResult {
	const { format, encoding } = key;
	const [debounced] = useDebouncedValue(material, 150);
	const [result, setResult] = useState<VerifyResult>({ state: "unverified" });

	useEffect(() => {
		if (!token) {
			setResult({ state: "unverified" });
			return;
		}
		let cancel = false;
		verifyJws(token, debounced, { format, encoding })
			.then((next) => {
				if (!cancel) setResult(next);
			})
			.catch((error: unknown) => {
				if (!cancel) {
					setResult({
						state: "error",
						detail:
							error instanceof Error
								? error.message
								: "Could not check the signature",
					});
				}
			});
		return () => {
			cancel = true;
		};
	}, [token, debounced, format, encoding]);

	return result;
}
