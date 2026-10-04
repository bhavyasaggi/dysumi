import { XMLParser } from "fast-xml-parser";
import type { CatalogDocument, CatalogMessage } from "./types";

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	removeNSPrefix: true,
	trimValues: true,
	isArray: (tagName) =>
		tagName === "file" ||
		tagName === "trans-unit" ||
		tagName === "unit" ||
		tagName === "segment" ||
		tagName === "note" ||
		tagName === "group",
});

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}

function asList(value: unknown): unknown[] {
	if (Array.isArray(value)) return value;
	if (value === undefined || value === null) return [];
	return [value];
}

function textOf(value: unknown): string {
	if (typeof value === "string" || typeof value === "number")
		return String(value);
	if (!value || typeof value !== "object") return "";
	const record = value as Record<string, unknown>;
	if (typeof record["#text"] === "string") return record["#text"];
	return "";
}

function notesOf(value: unknown): string {
	return asList(value)
		.map((note) => textOf(note))
		.filter(Boolean)
		.join("\n");
}

function unitMessages(unit: unknown): CatalogMessage[] {
	const record = asRecord(unit);
	const id = textOf(record["@_id"]) || textOf(record["@_resname"]);
	const direct = textOf(record.source);
	if (direct || record.target) {
		return [
			{
				id: id || direct,
				source: direct,
				target: textOf(record.target),
				description: notesOf(record.note),
				notes: "",
			},
		];
	}
	return asList(record.segment).map((segment, index) => {
		const row = asRecord(segment);
		return {
			id: id ? `${id}:${index + 1}` : `segment-${index + 1}`,
			source: textOf(row.source),
			target: textOf(row.target),
			description: notesOf(record.note),
			notes: "",
		};
	});
}

function fileMessages(file: unknown): CatalogMessage[] {
	const record = asRecord(file);
	const body = asRecord(record.body);
	const grouped = asList(record.group).flatMap((group) =>
		asList(asRecord(group).unit),
	);
	const units = [
		...asList(body["trans-unit"]),
		...asList(record.unit),
		...grouped,
	];
	return units
		.flatMap((unit) => unitMessages(unit))
		.filter((row) => row.source);
}

export function parseXliff(text: string): CatalogDocument {
	const root = asRecord(parser.parse(text));
	const xliff = asRecord(root.xliff ?? root);
	const files = asList(xliff.file);
	const messages = files.flatMap((file) => fileMessages(file));
	if (messages.length === 0)
		throw new Error("No translation units in this file");
	const first = asRecord(files[0]);
	return {
		kind: "xliff",
		title: "XLIFF",
		locale: textOf(first["@_source-language"]),
		targetLocale: textOf(first["@_target-language"]),
		messages,
	};
}
