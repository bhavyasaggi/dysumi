import "leaflet/dist/leaflet.css";

import { Box, type TreeNodeData } from "@mantine/core";
import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import {
	collectCoords,
	DEFAULT_COLOR,
	type KMLFolder,
	kmlToGeoJSON,
	resolveStyle,
	type StyleInfo,
} from "@/lib/utils/kml";

import ViewerKMLLegend from "./Legend";

import styles from "./styles.module.scss";

interface ViewerKMLProps {
	kmlString: string;
}

function featureBounds(feature: GeoJSON.Feature): L.LatLngBounds | null {
	if (!feature.geometry) return null;
	const coords: [number, number][] = [];
	collectCoords(feature.geometry, coords);
	if (coords.length === 0) return null;
	if (coords.length === 1) {
		return L.latLng(coords[0][0], coords[0][1]).toBounds(1000);
	}
	return L.latLngBounds(coords);
}

function computeBounds(
	fc: GeoJSON.FeatureCollection,
): L.LatLngBoundsExpression | null {
	const coords: [number, number][] = [];
	for (const feature of fc.features) {
		if (feature.geometry) collectCoords(feature.geometry, coords);
	}
	if (coords.length === 0) return null;
	if (coords.length === 1) {
		return L.latLng(coords[0][0], coords[0][1]).toBounds(1000);
	}
	return L.latLngBounds(coords);
}

function featureColor(
	feature: GeoJSON.Feature,
	styleMap: Map<string, StyleInfo>,
): string {
	const s = resolveStyle(feature, styleMap);
	if (feature.geometry?.type === "Point") return s?.polyColor ?? DEFAULT_COLOR;
	return s?.lineColor ?? DEFAULT_COLOR;
}

const FEATURE_PREFIX = "feature:";
const FOLDER_PREFIX = "folder:";

function folderToTreeNodes(
	folder: KMLFolder,
	features: GeoJSON.Feature[],
	styleMap: Map<string, StyleInfo>,
	path: string,
): TreeNodeData {
	const folderValue = `${FOLDER_PREFIX}${path}`;
	const children: TreeNodeData[] = [];

	for (const fi of folder.featureIndices) {
		const f = features[fi];
		children.push({
			value: `${FEATURE_PREFIX}${fi}`,
			label: (f.properties?.name as string) ?? `Feature ${fi + 1}`,
			nodeProps: {
				"data-geo-type": f.geometry?.type ?? "Point",
				"data-color": featureColor(f, styleMap),
			},
		});
	}

	for (const child of folder.children) {
		children.push(
			folderToTreeNodes(child, features, styleMap, `${path}/${child.name}`),
		);
	}

	return {
		value: folderValue,
		label: folder.name,
		children,
	};
}

function buildTreeData(
	folders: KMLFolder[],
	rootFeatureIndices: number[],
	features: GeoJSON.Feature[],
	styleMap: Map<string, StyleInfo>,
): TreeNodeData[] {
	const nodes: TreeNodeData[] = [];

	for (const fi of rootFeatureIndices) {
		const f = features[fi];
		nodes.push({
			value: `${FEATURE_PREFIX}${fi}`,
			label: (f.properties?.name as string) ?? `Feature ${fi + 1}`,
			nodeProps: {
				"data-geo-type": f.geometry?.type ?? "Point",
				"data-color": featureColor(f, styleMap),
			},
		});
	}

	for (const folder of folders) {
		nodes.push(folderToTreeNodes(folder, features, styleMap, folder.name));
	}

	return nodes;
}

const DEFAULT_CENTER: L.LatLngExpression = [20, 0];

export default function ViewerKML({ kmlString }: ViewerKMLProps) {
	const mapRef = useRef<L.Map | null>(null);

	const { geojson, styleMap, folders, rootFeatureIndices } = useMemo(
		() => kmlToGeoJSON(kmlString),
		[kmlString],
	);

	const treeData = buildTreeData(
		folders,
		rootFeatureIndices,
		geojson.features,
		styleMap,
	);

	const flyToFeature = useCallback(
		(value: string) => {
			if (!value.startsWith(FEATURE_PREFIX)) return;
			const index = Number(value.slice(FEATURE_PREFIX.length));
			const feature = geojson.features[index];
			if (!(feature && mapRef.current)) return;
			const fb = featureBounds(feature);
			if (fb) {
				mapRef.current.flyToBounds(fb, {
					padding: [60, 60],
					maxZoom: 16,
					duration: 0.8,
				});
			}
		},
		[geojson.features],
	);

	const bounds = useMemo(() => computeBounds(geojson), [geojson]);

	useEffect(() => {
		if (mapRef.current && bounds) {
			mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression, {
				padding: [40, 40],
				maxZoom: 16,
			});
		}
	}, [bounds]);

	return (
		<Box className={styles.container}>
			<div className={styles.mapArea}>
				<MapContainer
					ref={mapRef}
					center={DEFAULT_CENTER}
					zoom={2}
					style={{ width: "100%", height: "100%" }}
					scrollWheelZoom
				>
					<TileLayer
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>
					<GeoJSON
						key={kmlString.length}
						data={geojson}
						style={(feature) => {
							const s = resolveStyle(feature, styleMap);
							return {
								color: s?.lineColor ?? DEFAULT_COLOR,
								opacity: s?.lineOpacity ?? 1,
								weight: s?.lineWidth ?? 2,
								fillColor: s?.polyColor ?? DEFAULT_COLOR,
								fillOpacity: s?.polyOpacity ?? 0.3,
							};
						}}
						pointToLayer={(feature, latlng) => {
							const s = resolveStyle(feature, styleMap);
							if (s?.iconUrl) {
								return L.marker(latlng, {
									icon: L.icon({
										iconUrl: s.iconUrl,
										iconSize: [32, 32],
										iconAnchor: [16, 32],
									}),
								});
							}
							return L.circleMarker(latlng, {
								radius: 6,
								fillColor: s?.polyColor ?? DEFAULT_COLOR,
								fillOpacity: s?.polyOpacity ?? 0.8,
								color: s?.lineColor ?? DEFAULT_COLOR,
								weight: s?.lineWidth ?? 2,
							});
						}}
						onEachFeature={(feature, layer) => {
							const parts: string[] = [];
							if (feature.properties?.name) {
								parts.push(`<strong>${feature.properties.name}</strong>`);
							}
							if (feature.properties?.description) {
								parts.push(feature.properties.description);
							}
							if (parts.length > 0) {
								layer.bindPopup(parts.join("<br/>"));
							}
						}}
					/>
				</MapContainer>
			</div>
			<ViewerKMLLegend
				data={treeData}
				onSelect={(selected) => {
					const value = selected[0];
					if (value) flyToFeature(value);
				}}
				featureCount={geojson.features.length}
			/>
		</Box>
	);
}
