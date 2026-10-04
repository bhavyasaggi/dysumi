import type { GeoDocument, KMLFolder, StyleInfo } from "@/lib/utils/kml";

// Map does not survive a worker boundary, so the parsed document crosses as entries.
export interface GeoDocumentWire {
	geojson: GeoJSON.FeatureCollection;
	styleEntries: [string, StyleInfo][];
	folders: KMLFolder[];
	rootFeatureIndices: number[];
}

export function geoDocumentToWire(document: GeoDocument): GeoDocumentWire {
	return {
		geojson: document.geojson,
		styleEntries: [...document.styleMap.entries()],
		folders: document.folders,
		rootFeatureIndices: document.rootFeatureIndices,
	};
}

export function geoDocumentFromWire(wire: GeoDocumentWire): GeoDocument {
	return {
		geojson: wire.geojson,
		styleMap: new Map(wire.styleEntries),
		folders: wire.folders,
		rootFeatureIndices: wire.rootFeatureIndices,
	};
}
