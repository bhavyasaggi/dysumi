import * as Comlink from "comlink";
import { parseCatalog } from "@/lib/utils/catalog/parse";
import type { CatalogDocument, CatalogKind } from "@/lib/utils/catalog/types";
import { type FinanceKind, parseFinance } from "@/lib/utils/finance/parse";
import {
	type GeoDocumentWire,
	geoDocumentToWire,
} from "@/lib/utils/geo/document";
import { geojsonToDocument } from "@/lib/utils/geo/geojson";
import { kmlFromKmz } from "@/lib/utils/geo/kmz";
import { tcxToGeoJSON } from "@/lib/utils/geo/tcx";
import type { HarEntry, HarSummary } from "@/lib/utils/har";
import { parseHar } from "@/lib/utils/har";
import type { CalendarData } from "@/lib/utils/ics";
import { parseIcs } from "@/lib/utils/ics";
import { kmlToGeoJSON } from "@/lib/utils/kml";
import type { MidiSong } from "@/lib/utils/midi/parse";
import { parseMidi } from "@/lib/utils/midi/parse";
import { parseVcards } from "@/lib/utils/vcard/parse";
import type { VCard } from "@/lib/utils/vcard/types";

export interface ParseReply<T> {
	ok: boolean;
	data?: T;
	error?: string;
}

function reply<T>(work: () => T): ParseReply<T> {
	try {
		return { ok: true, data: work() };
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function readGeo(text: string, geoKind: "kml" | "tcx" | "geojson") {
	if (geoKind === "tcx") return tcxToGeoJSON(text);
	if (geoKind === "geojson") return geojsonToDocument(text);
	return kmlToGeoJSON(text);
}

const parser = {
	finance(text: string, options: { financeKind: FinanceKind }) {
		return reply(() => parseFinance(text, options.financeKind));
	},
	har(text: string) {
		return reply(() => parseHar(text));
	},
	ics(text: string) {
		return reply(() => parseIcs(text));
	},
	geo(text: string, options: { geoKind: "kml" | "tcx" | "geojson" }) {
		return reply(() => geoDocumentToWire(readGeo(text, options.geoKind)));
	},
	kmz(bytes: Uint8Array) {
		return reply(() => geoDocumentToWire(kmlToGeoJSON(kmlFromKmz(bytes))));
	},
	catalog(text: string, options: { kind: CatalogKind }) {
		return reply(() => parseCatalog(text, options.kind));
	},
	vcard(text: string) {
		return reply(() => parseVcards(text));
	},
	midi(bytes: Uint8Array) {
		return reply(() => parseMidi(bytes));
	},
};

export type ParseWorker = typeof parser;
export type HarParse = { entries: HarEntry[]; summary: HarSummary };
export type { CalendarData, CatalogDocument, GeoDocumentWire, MidiSong, VCard };

Comlink.expose(parser);
