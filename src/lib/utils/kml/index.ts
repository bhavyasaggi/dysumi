export interface StyleInfo {
	lineColor: string;
	lineOpacity: number;
	lineWidth: number;
	polyColor: string;
	polyOpacity: number;
	iconUrl: string | null;
}

export const DEFAULT_COLOR = "#3388ff";

// KML encodes colors as aabbggrr (alpha, blue, green, red)
function kmlColor(kmlHex: string | null | undefined): string {
	if (!kmlHex || kmlHex.length !== 8) return DEFAULT_COLOR;
	const r = kmlHex.slice(6, 8);
	const g = kmlHex.slice(4, 6);
	const b = kmlHex.slice(2, 4);
	return `#${r}${g}${b}`;
}

function kmlOpacity(kmlHex: string | null | undefined): number {
	if (!kmlHex || kmlHex.length !== 8) return 1;
	return Number.parseInt(kmlHex.slice(0, 2), 16) / 255;
}

function parseCoordinates(text: string): [number, number][] {
	return text
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((tuple) => {
			const parts = tuple.split(",").map(Number);
			return [parts[0], parts[1]] as [number, number];
		});
}

function getDirectChildText(
	el: Element | undefined,
	tag: string,
): string | null {
	if (!el) return null;
	for (const child of Array.from(el.children)) {
		if (child.tagName === tag) return child.textContent?.trim() ?? null;
	}
	return null;
}

function getDescendantText(
	el: Element | undefined,
	tag: string,
): string | null {
	if (!el) return null;
	const child = el.getElementsByTagName(tag)[0];
	return child?.textContent?.trim() ?? null;
}

function parseStyleElement(style: Element): StyleInfo {
	const lineStyle = style.getElementsByTagName("LineStyle")[0];
	const polyStyle = style.getElementsByTagName("PolyStyle")[0];
	const iconStyle = style.getElementsByTagName("IconStyle")[0];

	const lineColorRaw = getDirectChildText(lineStyle, "color");
	const polyColorRaw = getDirectChildText(polyStyle, "color");
	const widthRaw = getDirectChildText(lineStyle, "width");
	const iconHref = iconStyle
		? getDirectChildText(iconStyle.getElementsByTagName("Icon")[0], "href")
		: null;

	return {
		lineColor: kmlColor(lineColorRaw),
		lineOpacity: kmlOpacity(lineColorRaw),
		lineWidth: widthRaw ? Number(widthRaw) : 2,
		polyColor: kmlColor(polyColorRaw),
		polyOpacity: kmlOpacity(polyColorRaw),
		iconUrl: iconHref,
	};
}

function parseStyles(doc: Document): Map<string, StyleInfo> {
	const styleMap = new Map<string, StyleInfo>();

	for (const style of Array.from(doc.getElementsByTagName("Style"))) {
		const id = style.getAttribute("id");
		if (!id) continue;
		styleMap.set(`#${id}`, parseStyleElement(style));
	}

	// StyleMap: resolve the "normal" Pair to its referenced Style
	for (const sm of Array.from(doc.getElementsByTagName("StyleMap"))) {
		const id = sm.getAttribute("id");
		if (!id) continue;
		for (const pair of Array.from(sm.getElementsByTagName("Pair"))) {
			const key = getDirectChildText(pair, "key");
			if (key !== "normal") continue;
			const pairStyleUrl = getDirectChildText(pair, "styleUrl");
			const resolved = pairStyleUrl ? styleMap.get(pairStyleUrl) : undefined;
			if (resolved) {
				styleMap.set(`#${id}`, resolved);
			}
			// Inline Style inside the Pair
			const inlineStyle = pair.getElementsByTagName("Style")[0];
			if (inlineStyle) {
				styleMap.set(`#${id}`, parseStyleElement(inlineStyle));
			}
			break;
		}
	}

	return styleMap;
}

function parsePlacemarkProps(
	placemark: Element,
	styleMap: Map<string, StyleInfo>,
): Record<string, unknown> {
	const props: Record<string, unknown> = {};
	const name = getDirectChildText(placemark, "name");
	const description = getDirectChildText(placemark, "description");
	const styleUrl = getDirectChildText(placemark, "styleUrl");
	if (name) props.name = name;
	if (description) props.description = description;

	if (styleUrl) {
		props.styleUrl = styleUrl;
	} else {
		// Inline <Style> directly inside the Placemark (no id)
		const inlineStyle = Array.from(placemark.children).find(
			(c) => c.tagName === "Style",
		);
		if (inlineStyle) {
			const key = `#_inline_${Math.random().toString(36).slice(2, 10)}`;
			styleMap.set(key, parseStyleElement(inlineStyle));
			props.styleUrl = key;
		}
	}

	return props;
}

function parsePoints(
	placemark: Element,
	props: Record<string, unknown>,
): GeoJSON.Feature[] {
	const features: GeoJSON.Feature[] = [];
	for (const point of Array.from(placemark.getElementsByTagName("Point"))) {
		const coordsText = getDescendantText(point, "coordinates");
		if (!coordsText) continue;
		const coords = parseCoordinates(coordsText);
		if (coords.length === 0) continue;
		features.push({
			type: "Feature",
			properties: props,
			geometry: {
				type: "Point",
				coordinates: [coords[0][0], coords[0][1]],
			},
		});
	}
	return features;
}

function parseLineStrings(
	placemark: Element,
	props: Record<string, unknown>,
): GeoJSON.Feature[] {
	const features: GeoJSON.Feature[] = [];
	for (const line of Array.from(placemark.getElementsByTagName("LineString"))) {
		const coordsText = getDescendantText(line, "coordinates");
		if (!coordsText) continue;
		const coords = parseCoordinates(coordsText);
		if (coords.length < 2) continue;
		features.push({
			type: "Feature",
			properties: props,
			geometry: { type: "LineString", coordinates: coords },
		});
	}
	return features;
}

function parsePolygons(
	placemark: Element,
	props: Record<string, unknown>,
): GeoJSON.Feature[] {
	const features: GeoJSON.Feature[] = [];
	for (const polygon of Array.from(placemark.getElementsByTagName("Polygon"))) {
		const outerBoundary = polygon.getElementsByTagName("outerBoundaryIs")[0];
		if (!outerBoundary) continue;
		const coordsText = getDescendantText(outerBoundary, "coordinates");
		if (!coordsText) continue;
		const outerCoords = parseCoordinates(coordsText);

		const holes: [number, number][][] = [];
		for (const inner of Array.from(
			polygon.getElementsByTagName("innerBoundaryIs"),
		)) {
			const innerText = getDescendantText(inner, "coordinates");
			if (!innerText) continue;
			holes.push(parseCoordinates(innerText));
		}

		features.push({
			type: "Feature",
			properties: props,
			geometry: {
				type: "Polygon",
				coordinates: [outerCoords, ...holes],
			},
		});
	}
	return features;
}

export interface KMLFolder {
	name: string;
	featureIndices: number[];
	children: KMLFolder[];
}

function parsePlacemarksFromElement(
	container: Element,
	styleMap: Map<string, StyleInfo>,
	features: GeoJSON.Feature[],
	counter: { value: number },
): number[] {
	const indices: number[] = [];
	for (const child of Array.from(container.children)) {
		if (child.tagName !== "Placemark") continue;
		const props = parsePlacemarkProps(child, styleMap);
		const parsed = [
			...parsePoints(child, props),
			...parseLineStrings(child, props),
			...parsePolygons(child, props),
		];
		for (const f of parsed) {
			f.id = counter.value++;
			features.push(f);
			indices.push(f.id as number);
		}
	}
	return indices;
}

function parseFolderTree(
	container: Element,
	styleMap: Map<string, StyleInfo>,
	features: GeoJSON.Feature[],
	counter: { value: number },
): KMLFolder[] {
	const folders: KMLFolder[] = [];
	for (const child of Array.from(container.children)) {
		if (child.tagName !== "Folder") continue;
		const name = getDirectChildText(child, "name") ?? "Folder";
		const featureIndices = parsePlacemarksFromElement(
			child,
			styleMap,
			features,
			counter,
		);
		const children = parseFolderTree(child, styleMap, features, counter);
		folders.push({ name, featureIndices, children });
	}
	return folders;
}

export function kmlToGeoJSON(kmlString: string): {
	geojson: GeoJSON.FeatureCollection;
	styleMap: Map<string, StyleInfo>;
	folders: KMLFolder[];
	rootFeatureIndices: number[];
} {
	const parser = new DOMParser();
	const doc = parser.parseFromString(kmlString, "application/xml");
	const styleMap = parseStyles(doc);
	const features: GeoJSON.Feature[] = [];
	const counter = { value: 0 };

	// Find the root container (Document or the kml element itself)
	const root = doc.getElementsByTagName("Document")[0] ?? doc.documentElement;

	// Parse top-level placemarks (not inside any Folder)
	const rootFeatureIndices = parsePlacemarksFromElement(
		root,
		styleMap,
		features,
		counter,
	);

	// Parse folder hierarchy recursively
	const folders = parseFolderTree(root, styleMap, features, counter);

	return {
		geojson: { type: "FeatureCollection", features },
		styleMap,
		folders,
		rootFeatureIndices,
	};
}

export function collectCoords(
	geometry: GeoJSON.Geometry,
	out: [number, number][],
): void {
	switch (geometry.type) {
		case "Point":
			out.push([geometry.coordinates[1], geometry.coordinates[0]]);
			break;
		case "LineString":
		case "MultiPoint":
			for (const c of geometry.coordinates) {
				out.push([c[1], c[0]]);
			}
			break;
		case "Polygon":
		case "MultiLineString":
			for (const ring of geometry.coordinates) {
				for (const c of ring) {
					out.push([c[1], c[0]]);
				}
			}
			break;
		case "MultiPolygon":
			for (const poly of geometry.coordinates) {
				for (const ring of poly) {
					for (const c of ring) {
						out.push([c[1], c[0]]);
					}
				}
			}
			break;
		case "GeometryCollection":
			for (const g of geometry.geometries) {
				collectCoords(g, out);
			}
			break;
	}
}

export function resolveStyle(
	feature: GeoJSON.Feature | undefined,
	styleMap: Map<string, StyleInfo>,
): StyleInfo | undefined {
	const styleUrl = feature?.properties?.styleUrl as string | undefined;
	return styleUrl ? styleMap.get(styleUrl) : undefined;
}
