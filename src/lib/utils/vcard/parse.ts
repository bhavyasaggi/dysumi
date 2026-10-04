import type { VCard, VCardField } from "./types";

interface VCardParts {
	name: string;
	photo: string;
	fields: VCardField[];
}

const FIELD_LABELS: Record<string, string> = {
	NICKNAME: "Nickname",
	ORG: "Organization",
	TITLE: "Title",
	ROLE: "Role",
	EMAIL: "Email",
	TEL: "Phone",
	URL: "URL",
	BDAY: "Birthday",
	ADR: "Address",
	NOTE: "Note",
};

function unfold(text: string): string[] {
	return text
		.replace(/^\uFEFF/, "")
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.replace(/\n[ \t]/g, "")
		.split("\n");
}

function decodeQuotedPrintable(value: string): string {
	const cleaned = value.replace(/=\r?\n/g, "");
	const bytes: number[] = [];
	for (let index = 0; index < cleaned.length; index += 1) {
		const hex = cleaned.slice(index + 1, index + 3);
		if (cleaned[index] === "=" && /^[0-9A-F]{2}$/i.test(hex)) {
			bytes.push(Number.parseInt(hex, 16));
			index += 2;
		} else {
			bytes.push(cleaned.charCodeAt(index));
		}
	}
	return new TextDecoder().decode(Uint8Array.from(bytes));
}

function splitProperty(line: string): {
	name: string;
	params: Record<string, string>;
	value: string;
} {
	const colon = line.indexOf(":");
	if (colon < 0) return { name: "", params: {}, value: line };
	const [rawName, ...parts] = line.slice(0, colon).split(";");
	const params: Record<string, string> = {};
	for (const part of parts) {
		const eq = part.indexOf("=");
		if (eq < 0) params[part.toUpperCase()] = part;
		else {
			params[part.slice(0, eq).toUpperCase()] = part
				.slice(eq + 1)
				.replace(/^"|"$/g, "");
		}
	}
	return {
		name: rawName?.split(".").pop()?.toUpperCase() ?? "",
		params,
		value: line.slice(colon + 1),
	};
}

function decodeValue(params: Record<string, string>, value: string): string {
	const encoding = (params.ENCODING ?? "").toUpperCase();
	if (encoding === "QUOTED-PRINTABLE") return decodeQuotedPrintable(value);
	return value.replace(/\\n/g, "\n").replace(/\\,/g, ",");
}

function addressOf(value: string): string {
	return value
		.split(";")
		.map((part) => part.trim())
		.filter(Boolean)
		.join(", ");
}

function photoOf(params: Record<string, string>, value: string): string {
	if (value.startsWith("data:") || /^https?:/i.test(value)) return value;
	const type = (params.TYPE ?? "jpeg").split(",")[0]?.toLowerCase() || "jpeg";
	const mime = type.includes("/")
		? type
		: `image/${type === "jpg" ? "jpeg" : type}`;
	return `data:${mime};base64,${value.replace(/\s/g, "")}`;
}

function applyField(parts: VCardParts, line: string) {
	const { name, params, value } = splitProperty(line);
	const decoded = decodeValue(params, value).trim();
	if (!decoded) return;
	if (name === "FN") {
		parts.name = decoded;
		return;
	}
	if (name === "PHOTO") {
		parts.photo = photoOf(params, decoded);
		return;
	}
	const label = FIELD_LABELS[name];
	if (!label) return;
	const shown = name === "ADR" ? addressOf(decoded) : decoded;
	const type = params.TYPE?.split(",")[0];
	parts.fields.push({
		label: type && name !== "PHOTO" ? `${label} (${type})` : label,
		value: shown,
	});
}

function cardFrom(lines: string[], id: string): VCard {
	const parts: VCardParts = { name: "", photo: "", fields: [] };
	for (const line of lines) applyField(parts, line);
	if (!parts.name) {
		const named = parts.fields.find((field) => field.label === "Nickname");
		parts.name = named?.value || "Unnamed contact";
	}
	return { id, ...parts };
}

export function parseVcards(text: string): VCard[] {
	const cards: VCard[] = [];
	let lines: string[] | null = null;
	for (const line of unfold(text)) {
		const marker = line.trim().toUpperCase();
		if (marker === "BEGIN:VCARD") {
			lines = [];
			continue;
		}
		if (marker === "END:VCARD") {
			if (lines) cards.push(cardFrom(lines, `card-${cards.length + 1}`));
			lines = null;
			continue;
		}
		if (lines && line.trim()) lines.push(line);
	}
	if (cards.length === 0) throw new Error("No vCard records in this file");
	return cards;
}
