import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { getParseWorkerApi } from "@/lib/parse-worker-api";
import type { CatalogKind } from "@/lib/utils/catalog/types";
import type { FinanceDocument, FinanceKind } from "@/lib/utils/finance/parse";
import type { GeoDocumentWire } from "@/lib/utils/geo/document";
import type { CalendarData } from "@/lib/utils/ics";
import type {
	CatalogDocument,
	HarParse,
	MidiSong,
	ParseReply,
	VCard,
} from "@/lib/workers/parse-worker";

export function parseQueryError(error: unknown, fallback: string): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"error" in error &&
		typeof error.error === "string"
	) {
		return error.error;
	}
	return fallback;
}

function failure(error: string) {
	return { error: { status: "CUSTOM_ERROR" as const, error } };
}

async function take<T>(reply: Promise<ParseReply<T>>) {
	const result = await reply;
	if (!result.ok || result.data === undefined) {
		return failure(result.error ?? "Could not read this file");
	}
	return { data: result.data };
}

export const parseApi = createApi({
	reducerPath: "parseApi",
	baseQuery: fakeBaseQuery(),
	endpoints: (builder) => ({
		parseFinance: builder.query<
			FinanceDocument,
			{ text: string; financeKind: FinanceKind }
		>({
			queryFn: async ({ text, financeKind }) => {
				const worker = getParseWorkerApi();
				return await take(worker.finance(text, { financeKind }));
			},
		}),
		parseHar: builder.query<HarParse, { text: string }>({
			queryFn: async ({ text }) => {
				const worker = getParseWorkerApi();
				return await take(worker.har(text));
			},
		}),
		parseIcs: builder.query<CalendarData, { text: string }>({
			queryFn: async ({ text }) => {
				const worker = getParseWorkerApi();
				return await take(worker.ics(text));
			},
		}),
		parseGeo: builder.query<
			GeoDocumentWire,
			{ text: string; geoKind: "kml" | "tcx" | "geojson" }
		>({
			queryFn: async ({ text, geoKind }) => {
				const worker = getParseWorkerApi();
				return await take(worker.geo(text, { geoKind }));
			},
		}),
		parseKmz: builder.query<GeoDocumentWire, { bytes: Uint8Array }>({
			queryFn: async ({ bytes }) => {
				const worker = getParseWorkerApi();
				return await take(worker.kmz(bytes));
			},
		}),
		parseCatalog: builder.query<
			CatalogDocument,
			{ text: string; kind: CatalogKind }
		>({
			queryFn: async ({ text, kind }) => {
				const worker = getParseWorkerApi();
				return await take(worker.catalog(text, { kind }));
			},
		}),
		parseVcard: builder.query<VCard[], { text: string }>({
			queryFn: async ({ text }) => {
				const worker = getParseWorkerApi();
				return await take(worker.vcard(text));
			},
		}),
		parseMidi: builder.query<MidiSong, { stamp: string; bytes: Uint8Array }>({
			serializeQueryArgs: ({ queryArgs }) => queryArgs.stamp,
			queryFn: async ({ bytes }) => {
				const worker = getParseWorkerApi();
				return await take(worker.midi(bytes));
			},
		}),
	}),
});

export const {
	useParseFinanceQuery,
	useParseHarQuery,
	useParseIcsQuery,
	useParseGeoQuery,
	useParseKmzQuery,
	useParseCatalogQuery,
	useParseVcardQuery,
	useParseMidiQuery,
} = parseApi;
