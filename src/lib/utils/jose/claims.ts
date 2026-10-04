// Registered JWT and OpenID claims. Unknown names still render, without a hint.
export const CLAIM_INFO: Record<string, string> = {
	iss: "Issuer of the token",
	sub: "Subject of the token",
	aud: "Audience the token is intended for",
	exp: "Expiration time",
	nbf: "Not valid before this time",
	iat: "Issued at",
	jti: "Unique token identifier",
	azp: "Authorized party",
	scope: "Space-separated OAuth scopes",
	sid: "Session identifier",
	auth_time: "Time the user authenticated",
	nonce: "Value sent with the authentication request",
	acr: "Authentication context class",
	amr: "Authentication methods",
	at_hash: "Access token hash",
	c_hash: "Authorization code hash",
	email: "Email address",
	email_verified: "Whether the email address was verified",
	name: "Full name",
	given_name: "Given name",
	family_name: "Family name",
	middle_name: "Middle name",
	nickname: "Nickname",
	preferred_username: "Preferred username",
	picture: "Profile picture URL",
	website: "Web site",
	gender: "Gender",
	birthdate: "Birthday",
	zoneinfo: "Time zone",
	locale: "Locale",
	phone_number: "Phone number",
	phone_number_verified: "Whether the phone number was verified",
	address: "Postal address",
	updated_at: "Time the profile was last updated",
	alg: "Signature or encryption algorithm",
	typ: "Media type of this object",
	kid: "Key identifier",
	cty: "Content type of the payload",
	crit: "Header parameters that must be understood",
	jku: "URL of a JWK set",
	jwk: "JSON web key embedded in the header",
	x5u: "URL of an X.509 certificate chain",
	x5c: "X.509 certificate chain",
	x5t: "SHA-1 thumbprint of an X.509 certificate",
	"x5t#S256": "SHA-256 thumbprint of an X.509 certificate",
	enc: "Content encryption algorithm",
	zip: "Compression applied before encryption",
	kty: "Key type",
	use: "Intended key use",
	key_ops: "Allowed key operations",
	crv: "Elliptic curve",
};

export const ALG_INFO: Record<string, string> = {
	none: "Unsecured token, no signature",
	HS256: "HMAC using SHA-256",
	HS384: "HMAC using SHA-384",
	HS512: "HMAC using SHA-512",
	RS256: "RSASSA-PKCS1-v1_5 using SHA-256",
	RS384: "RSASSA-PKCS1-v1_5 using SHA-384",
	RS512: "RSASSA-PKCS1-v1_5 using SHA-512",
	PS256: "RSASSA-PSS using SHA-256",
	PS384: "RSASSA-PSS using SHA-384",
	PS512: "RSASSA-PSS using SHA-512",
	ES256: "ECDSA using P-256 and SHA-256",
	ES384: "ECDSA using P-384 and SHA-384",
	ES512: "ECDSA using P-521 and SHA-512",
	EdDSA: "EdDSA using Ed25519",
};

const TIME_CLAIMS = new Set(["exp", "nbf", "iat", "auth_time", "updated_at"]);

export function isTimeClaim(name: string): boolean {
	return TIME_CLAIMS.has(name);
}

export function formatTimestamp(seconds: number, now = Date.now()): string {
	const date = new Date(seconds * 1000);
	if (Number.isNaN(date.getTime())) return String(seconds);
	const delta = seconds * 1000 - now;
	const direction = delta >= 0 ? "from now" : "ago";
	const abs = Math.abs(delta);
	const minutes = Math.round(abs / 60_000);
	let relative = `${minutes} minutes ${direction}`;
	if (minutes >= 60 * 48) {
		relative = `${Math.round(minutes / (60 * 24))} days ${direction}`;
	} else if (minutes >= 120) {
		relative = `${Math.round(minutes / 60)} hours ${direction}`;
	} else if (minutes < 1) {
		relative = delta >= 0 ? "moments from now" : "moments ago";
	}
	return `${date.toLocaleString()} (${relative})`;
}

export function timeState(
	name: string,
	seconds: number,
	now = Date.now(),
): "expired" | "pending" | null {
	const ms = seconds * 1000;
	if (name === "exp" && ms <= now) return "expired";
	if (name === "nbf" && ms > now) return "pending";
	return null;
}
