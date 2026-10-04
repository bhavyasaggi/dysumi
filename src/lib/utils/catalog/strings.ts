import type { CatalogDocument, CatalogMessage } from "./types";

function unescapeStrings(value: string): string {
	return value
		.replace(/\\n/g, "\n")
		.replace(/\\"/g, '"')
		.replace(/\\\\/g, "\\");
}

export function parseStrings(text: string): CatalogDocument {
	const messages: CatalogMessage[] = [];
	const pattern =
		/(?:\/\*([\s\S]*?)\*\/\s*)?"((?:\\.|[^"\\])*)"\s*=\s*"((?:\\.|[^"\\])*)"\s*;/g;
	for (const match of text.matchAll(pattern)) {
		messages.push({
			id: unescapeStrings(match[2] ?? ""),
			source: unescapeStrings(match[3] ?? ""),
			target: "",
			description: (match[1] ?? "").trim(),
			notes: "",
		});
	}
	if (messages.length === 0) {
		throw new Error("No entries in this strings file");
	}
	return {
		kind: "strings",
		title: "Strings catalog",
		locale: "",
		targetLocale: "",
		messages,
	};
}
