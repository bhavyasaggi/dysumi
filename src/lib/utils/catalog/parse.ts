import { parseArb } from "./arb";
import { parseGettext } from "./gettext";
import { parseStrings } from "./strings";
import type { CatalogDocument, CatalogKind } from "./types";
import { parseXliff } from "./xliff";

export type { CatalogDocument, CatalogKind, CatalogMessage } from "./types";

export function parseCatalog(text: string, kind: CatalogKind): CatalogDocument {
	if (kind === "arb") return parseArb(text);
	if (kind === "po" || kind === "pot") return parseGettext(text, kind);
	if (kind === "strings") return parseStrings(text);
	return parseXliff(text);
}
