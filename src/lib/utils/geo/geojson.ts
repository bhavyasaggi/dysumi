import type * as GeoJSON from "geojson";
import type { GeoDocument } from "@/lib/utils/kml";

const GEOMETRY = new Set([
	"Point",
	"MultiPoint",
	"LineString",
	"MultiLineString",
	"Polygon",
	"MultiPolygon",
	"GeometryCollection",
]);

function featureName(feature: GeoJSON.Feature, index: number): string {
	const props = feature.properties ?? {};
	const named = props.name ?? props.title ?? props.Name;
	if (typeof named === "string" && named.trim()) return named;
	return `Feature ${index + 1}`;
}

function featuresFrom(value: unknown): GeoJSON.Feature[] {
	if (!value || typeof value !== "object" || !("type" in value)) {
		throw new Error("This file is not GeoJSON");
	}
	const record = value as { type?: string; features?: unknown };
	if (record.type === "FeatureCollection") {
		if (!Array.isArray(record.features)) {
			throw new Error("GeoJSON features must be a list");
		}
		return record.features as GeoJSON.Feature[];
	}
	if (record.type === "Feature") return [value as GeoJSON.Feature];
	if (record.type && GEOMETRY.has(record.type)) {
		return [
			{
				type: "Feature",
				properties: {},
				geometry: value as GeoJSON.Geometry,
			},
		];
	}
	throw new Error("This file is not GeoJSON");
}

export function geojsonToDocument(text: string): GeoDocument {
	const features = featuresFrom(JSON.parse(text))
		.filter((feature) => feature.geometry)
		.map((feature, index) => ({
			...feature,
			id: index,
			properties: {
				...(feature.properties ?? {}),
				name: featureName(feature, index),
			},
		}));
	return {
		geojson: { type: "FeatureCollection", features },
		styleMap: new Map(),
		folders: [],
		rootFeatureIndices: features.map((_, index) => index),
	};
}
