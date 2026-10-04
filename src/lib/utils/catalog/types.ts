export type CatalogKind =
	| "arb"
	| "po"
	| "pot"
	| "xlf"
	| "xliff"
	| "xlif"
	| "strings";

export interface CatalogMessage {
	id: string;
	source: string;
	target: string;
	description: string;
	notes: string;
}

export interface CatalogDocument {
	kind: CatalogKind;
	title: string;
	locale: string;
	targetLocale: string;
	messages: CatalogMessage[];
}
