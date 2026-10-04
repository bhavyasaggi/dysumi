import type { CatalogDocument, CatalogMessage } from "./types";

type GettextSlot = "id" | "plural" | "context" | "target";

interface GettextDraft {
	id: string;
	context: string;
	target: string;
	note: string;
	plural: string;
	slot: GettextSlot;
}

function emptyDraft(): GettextDraft {
	return { id: "", context: "", target: "", note: "", plural: "", slot: "id" };
}

function appendSlot(draft: GettextDraft, value: string) {
	if (draft.slot === "context") draft.context += value;
	else if (draft.slot === "plural") draft.plural += value;
	else if (draft.slot === "target") draft.target += value;
	else draft.id += value;
}

function unescapePo(value: string): string {
	return value
		.replace(/\\n/g, "\n")
		.replace(/\\t/g, "\t")
		.replace(/\\r/g, "\r")
		.replace(/\\"/g, '"')
		.replace(/\\\\/g, "\\");
}

function quoted(chunk: string): string {
	const parts = chunk.match(/"(?:\\.|[^"\\])*"/g) ?? [];
	return parts.map((part) => unescapePo(part.slice(1, -1))).join("");
}

function headerLocale(header: string): string {
	const match = header.match(/^Language:\s*(.+)$/m);
	return match?.[1]?.trim() ?? "";
}

function commitDraft(draft: GettextDraft, messages: CatalogMessage[]) {
	if (!draft.id) return;
	const id = draft.context ? `${draft.context}: ${draft.id}` : draft.id;
	const notes = [draft.plural ? `Plural: ${draft.plural}` : "", draft.note]
		.filter(Boolean)
		.join("\n");
	messages.push({
		id,
		source: draft.id,
		target: draft.target,
		description: "",
		notes,
	});
}

function applyKeyword(draft: GettextDraft, line: string) {
	if (line.startsWith("msgctxt ")) {
		draft.slot = "context";
		appendSlot(draft, quoted(line.slice("msgctxt ".length)));
		return;
	}
	if (line.startsWith("msgid_plural ")) {
		draft.slot = "plural";
		appendSlot(draft, quoted(line.slice("msgid_plural ".length)));
		return;
	}
	if (line.startsWith("msgid ")) {
		draft.slot = "id";
		appendSlot(draft, quoted(line.slice("msgid ".length)));
		return;
	}
	if (line.startsWith("msgstr")) {
		draft.slot = "target";
		const next = quoted(line);
		draft.target = draft.target ? `${draft.target}\n${next}` : next;
	}
}

export function parseGettext(
	text: string,
	kind: "po" | "pot",
): CatalogDocument {
	const messages: CatalogMessage[] = [];
	let draft = emptyDraft();
	let header = "";
	for (const raw of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
		const line = raw.trim();
		if (!line) {
			if (!draft.id && draft.target) header = draft.target;
			else commitDraft(draft, messages);
			draft = emptyDraft();
			continue;
		}
		if (line.startsWith("#")) {
			if (line.startsWith("#,") || line.startsWith("#~")) continue;
			const note = line.replace(/^#\.?\s?/, "");
			if (note) draft.note = draft.note ? `${draft.note}\n${note}` : note;
			continue;
		}
		if (line.startsWith('"')) {
			appendSlot(draft, quoted(line));
			continue;
		}
		applyKeyword(draft, line);
	}
	if (!draft.id && draft.target) header = draft.target;
	else commitDraft(draft, messages);
	if (messages.length === 0) throw new Error("No messages in this catalog");
	return {
		kind,
		title: kind === "pot" ? "Gettext template" : "Gettext catalog",
		locale: headerLocale(header),
		targetLocale: "",
		messages,
	};
}
