import "maplibre-gl/dist/maplibre-gl.css";

import { Box, Text, type TreeNodeData } from "@mantine/core";
import type * as GeoJSON from "geojson";
import {
	LngLatBounds,
	Map as MapLibre,
	type Map as MapLibreMap,
	type MapMouseEvent,
	Marker,
	NavigationControl,
	Popup,
	type StyleSpecification,
	setWorkerUrl,
} from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// The library looks for its worker beside the bundled chunk. Point it at the
// worker file Vite copies out.
setWorkerUrl(maplibreWorkerUrl);

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	DEFAULT_COLOR,
	type GeoDocument,
	type KMLFolder,
	resolveStyle,
	type StyleInfo,
} from "@/lib/utils/kml";

import ViewerKMLLegend from "./Legend";

import styles from "./styles.module.scss";

const OSM_STYLE: StyleSpecification = {
	version: 8,
	sources: {
		osm: {
			type: "raster",
			tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
			tileSize: 256,
			maxzoom: 19,
			attribution: "&copy; OpenStreetMap contributors",
		},
	},
	layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const LINE_TYPES = ["LineString", "MultiLineString", "Polygon", "MultiPolygon"];

const FEATURE_PREFIX = "feature:";
const FOLDER_PREFIX = "folder:";
const BLOCKED_TAGS = "script, iframe, object, embed, link";

function extendBounds(bounds: LngLatBounds, geometry: GeoJSON.Geometry): void {
	switch (geometry.type) {
		case "Point":
			bounds.extend([geometry.coordinates[0], geometry.coordinates[1]]);
			break;
		case "MultiPoint":
		case "LineString":
			for (const position of geometry.coordinates) {
				bounds.extend([position[0], position[1]]);
			}
			break;
		case "MultiLineString":
		case "Polygon":
			for (const ring of geometry.coordinates) {
				for (const position of ring) bounds.extend([position[0], position[1]]);
			}
			break;
		case "MultiPolygon":
			for (const polygon of geometry.coordinates) {
				for (const ring of polygon) {
					for (const position of ring) {
						bounds.extend([position[0], position[1]]);
					}
				}
			}
			break;
		case "GeometryCollection":
			for (const child of geometry.geometries) extendBounds(bounds, child);
			break;
	}
}

function boundsOf(
	geometry: GeoJSON.Geometry | null | undefined,
): LngLatBounds | null {
	if (!geometry) return null;
	const bounds = new LngLatBounds();
	extendBounds(bounds, geometry);
	return bounds.isEmpty() ? null : bounds;
}

function collectionBounds(features: GeoJSON.Feature[]): LngLatBounds | null {
	const bounds = new LngLatBounds();
	for (const feature of features) {
		if (feature.geometry) extendBounds(bounds, feature.geometry);
	}
	return bounds.isEmpty() ? null : bounds;
}

function featureColor(
	feature: GeoJSON.Feature,
	styleMap: Map<string, StyleInfo>,
): string {
	const style = resolveStyle(feature, styleMap);
	if (feature.geometry?.type === "Point") {
		return style?.polyColor ?? DEFAULT_COLOR;
	}
	return style?.lineColor ?? DEFAULT_COLOR;
}

function paintFeatures(
	features: GeoJSON.Feature[],
	styleMap: Map<string, StyleInfo>,
): GeoJSON.FeatureCollection {
	return {
		type: "FeatureCollection",
		features: features.map((feature) => {
			const style = resolveStyle(feature, styleMap);
			const point = feature.geometry?.type === "Point";
			const properties: GeoJSON.GeoJsonProperties = {
				...(feature.properties ?? {}),
				lineColor: style?.lineColor ?? DEFAULT_COLOR,
				lineOpacity: style?.lineOpacity ?? 1,
				lineWidth: style?.lineWidth ?? 2,
				polyColor: style?.polyColor ?? DEFAULT_COLOR,
				polyOpacity: point
					? (style?.polyOpacity ?? 0.8)
					: (style?.polyOpacity ?? 0.3),
			};
			if (style?.iconUrl && point) properties.iconUrl = style.iconUrl;
			return { ...feature, properties };
		}),
	};
}

function folderToTreeNodes(
	folder: KMLFolder,
	features: GeoJSON.Feature[],
	tree: { styleMap: Map<string, StyleInfo>; path: string },
): TreeNodeData {
	const { styleMap, path } = tree;
	const children: TreeNodeData[] = folder.featureIndices.map((index) => {
		const feature = features[index];
		return {
			value: `${FEATURE_PREFIX}${index}`,
			label: (feature?.properties?.name as string) ?? `Feature ${index + 1}`,
			nodeProps: {
				"data-geo-type": feature?.geometry?.type ?? "Point",
				"data-color": feature ? featureColor(feature, styleMap) : DEFAULT_COLOR,
			},
		};
	});

	for (const child of folder.children) {
		children.push(
			folderToTreeNodes(child, features, {
				styleMap,
				path: `${path}/${child.name}`,
			}),
		);
	}

	return {
		value: `${FOLDER_PREFIX}${path}`,
		label: folder.name,
		children,
	};
}

function buildTreeData(document: GeoDocument): TreeNodeData[] {
	const { folders, rootFeatureIndices, geojson, styleMap } = document;
	const nodes: TreeNodeData[] = rootFeatureIndices.map((index) => {
		const feature = geojson.features[index];
		return {
			value: `${FEATURE_PREFIX}${index}`,
			label: (feature?.properties?.name as string) ?? `Feature ${index + 1}`,
			nodeProps: {
				"data-geo-type": feature?.geometry?.type ?? "Point",
				"data-color": feature ? featureColor(feature, styleMap) : DEFAULT_COLOR,
			},
		};
	});
	for (const folder of folders) {
		nodes.push(
			folderToTreeNodes(folder, geojson.features, {
				styleMap,
				path: folder.name,
			}),
		);
	}
	return nodes;
}

function appendMarkup(parent: HTMLElement, html: string) {
	const parsed = new DOMParser().parseFromString(html, "text/html");
	for (const node of parsed.querySelectorAll(BLOCKED_TAGS)) node.remove();
	for (const element of parsed.body.querySelectorAll("*")) {
		for (const attr of [...element.attributes]) {
			if (attr.name.toLowerCase().startsWith("on")) {
				element.removeAttribute(attr.name);
			}
		}
	}
	parent.append(...parsed.body.childNodes);
}

function popupContent(
	properties: GeoJSON.GeoJsonProperties,
): HTMLElement | null {
	const name = typeof properties?.name === "string" ? properties.name : "";
	const description =
		typeof properties?.description === "string" ? properties.description : "";
	if (!(name || description)) return null;
	const root = document.createElement("div");
	if (name) {
		const title = document.createElement("strong");
		title.textContent = name;
		root.append(title);
	}
	if (description) {
		if (name) root.append(document.createElement("br"));
		appendMarkup(root, description);
	}
	return root;
}

function addIconMarkers(
	map: MapLibreMap,
	features: GeoJSON.Feature[],
): Marker[] {
	const markers: Marker[] = [];
	for (const feature of features) {
		if (feature.geometry?.type !== "Point") continue;
		const iconUrl = feature.properties?.iconUrl;
		if (typeof iconUrl !== "string" || !iconUrl) continue;
		const img = document.createElement("img");
		img.src = iconUrl;
		img.alt = "";
		img.width = 32;
		img.height = 32;
		img.draggable = false;
		const marker = new Marker({ element: img, anchor: "bottom" }).setLngLat([
			feature.geometry.coordinates[0],
			feature.geometry.coordinates[1],
		]);
		const content = popupContent(feature.properties);
		if (content) {
			marker.setPopup(
				new Popup({ closeButton: true, maxWidth: "280px" }).setDOMContent(
					content,
				),
			);
		}
		marker.addTo(map);
		markers.push(marker);
	}
	return markers;
}

function addGeoLayers(map: MapLibreMap, data: GeoJSON.FeatureCollection) {
	map.addSource("geo", { type: "geojson", data });
	map.addLayer({
		id: "geo-fill",
		type: "fill",
		source: "geo",
		filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
		paint: {
			"fill-color": ["coalesce", ["get", "polyColor"], DEFAULT_COLOR],
			"fill-opacity": ["coalesce", ["get", "polyOpacity"], 0.3],
		},
	});
	map.addLayer({
		id: "geo-line",
		type: "line",
		source: "geo",
		filter: ["in", ["geometry-type"], ["literal", LINE_TYPES]],
		layout: { "line-cap": "round", "line-join": "round" },
		paint: {
			"line-color": ["coalesce", ["get", "lineColor"], DEFAULT_COLOR],
			"line-opacity": ["coalesce", ["get", "lineOpacity"], 1],
			"line-width": ["coalesce", ["get", "lineWidth"], 2],
		},
	});
	map.addLayer({
		id: "geo-point",
		type: "circle",
		source: "geo",
		filter: [
			"all",
			["==", ["geometry-type"], "Point"],
			["!", ["has", "iconUrl"]],
		],
		paint: {
			"circle-radius": 6,
			"circle-color": ["coalesce", ["get", "polyColor"], DEFAULT_COLOR],
			"circle-opacity": ["coalesce", ["get", "polyOpacity"], 0.8],
			"circle-stroke-color": ["coalesce", ["get", "lineColor"], DEFAULT_COLOR],
			"circle-stroke-width": ["coalesce", ["get", "lineWidth"], 2],
		},
	});
}

export default function ViewerKML({ document }: { document: GeoDocument }) {
	const containerRef = useRef<HTMLElement>(null);
	const mapRef = useRef<MapLibreMap | null>(null);
	const [mapError, setMapError] = useState<string | null>(null);
	const features = document.geojson.features;

	const treeData = useMemo(() => buildTreeData(document), [document]);
	const painted = useMemo(
		() => paintFeatures(features, document.styleMap),
		[features, document.styleMap],
	);

	const flyToFeature = useCallback(
		(value: string) => {
			if (!value.startsWith(FEATURE_PREFIX)) return;
			const feature = features[Number(value.slice(FEATURE_PREFIX.length))];
			const bounds = boundsOf(feature?.geometry);
			if (!(bounds && mapRef.current)) return;
			mapRef.current.fitBounds(bounds, {
				padding: 60,
				maxZoom: 16,
				duration: 800,
			});
		},
		[features],
	);
	const handleLegendSelect = useCallback(
		(selected: string[]) => {
			const value = selected[0];
			if (value) flyToFeature(value);
		},
		[flyToFeature],
	);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		let map: MapLibreMap;
		try {
			map = new MapLibre({
				container,
				style: OSM_STYLE,
				center: [0, 20],
				zoom: 1.5,
				attributionControl: { compact: true },
				dragRotate: false,
				pitchWithRotate: false,
			});
		} catch (error) {
			setMapError(
				error instanceof Error ? error.message : "Could not open map",
			);
			return;
		}

		mapRef.current = map;
		map.addControl(new NavigationControl({ showCompass: false }), "top-right");
		const markers: Marker[] = [];
		const popup = new Popup({ closeButton: true, maxWidth: "280px" });
		let cancelled = false;

		const showPopup = (
			lngLat: [number, number],
			properties: GeoJSON.GeoJsonProperties,
		) => {
			const content = popupContent(properties);
			if (!content) return;
			popup.setLngLat(lngLat).setDOMContent(content).addTo(map);
		};

		const onClick = (event: MapMouseEvent) => {
			const hits = map.queryRenderedFeatures(event.point, {
				layers: ["geo-fill", "geo-line", "geo-point"],
			});
			const hit = hits[0];
			if (!hit) return;
			showPopup([event.lngLat.lng, event.lngLat.lat], hit.properties);
		};

		map.on("load", () => {
			if (cancelled) return;
			addGeoLayers(map, painted);
			markers.push(...addIconMarkers(map, painted.features));
			const bounds = collectionBounds(features);
			if (bounds) {
				map.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 0 });
			}
			map.on("click", onClick);
		});

		const observer = new ResizeObserver(() => {
			map.resize();
		});
		observer.observe(container);

		return () => {
			cancelled = true;
			observer.disconnect();
			for (const marker of markers) marker.remove();
			map.remove();
			mapRef.current = null;
		};
	}, [painted, features]);

	return (
		<Box className={styles.container}>
			<div className={styles.mapArea}>
				<section ref={containerRef} className={styles.map} aria-label="Map" />
				{mapError ? (
					<Text size="sm" c="red" p="sm" role="alert">
						{mapError}
					</Text>
				) : null}
			</div>
			<ViewerKMLLegend
				data={treeData}
				onSelect={handleLegendSelect}
				featureCount={features.length}
			/>
		</Box>
	);
}
