import type { CatalogDocument, CatalogMessage } from "./types";

function textOf(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function placeholderNotes(meta: unknown): string {
	if (!meta || typeof meta !== "object" || !("placeholders" in meta)) return "";
	const placeholders = meta.placeholders;
	if (!placeholders || typeof placeholders !== "object") return "";
	const notes = Object.entries(placeholders).map(([name, spec]) => {
		const type =
			spec && typeof spec === "object" && "type" in spec
				? textOf(spec.type)
				: "";
		return type ? `${name}: ${type}` : name;
	});
	return notes.length > 0 ? `Placeholders: ${notes.join(", ")}` : "";
}

function messageFrom(
	key: string,
	value: string,
	meta: unknown,
): CatalogMessage {
	const description =
		meta && typeof meta === "object" && "description" in meta
			? textOf(meta.description)
			: "";
	const type =
		meta && typeof meta === "object" && "type" in meta ? textOf(meta.type) : "";
	const notes = [type ? `Type: ${type}` : "", placeholderNotes(meta)]
		.filter(Boolean)
		.join(" · ");
	return { id: key, source: value, target: "", description, notes };
}

export function parseArb(text: string): CatalogDocument {
	const data = JSON.parse(text) as unknown;
	if (!data || typeof data !== "object" || Array.isArray(data)) {
		throw new Error("ARB files are JSON objects");
	}
	const record = data as Record<string, unknown>;
	const messages: CatalogMessage[] = [];
	for (const [key, value] of Object.entries(record)) {
		if (key.startsWith("@") || typeof value !== "string") continue;
		messages.push(messageFrom(key, value, record[`@${key}`]));
	}
	if (messages.length === 0) throw new Error("No messages in this ARB file");
	return {
		kind: "arb",
		title: "Application Resource Bundle",
		locale: textOf(record["@@locale"]),
		targetLocale: "",
		messages,
	};
}
