import { XMLParser } from "fast-xml-parser";
import type * as GeoJSON from "geojson";

import {
	DEFAULT_COLOR,
	type GeoDocument,
	type KMLFolder,
	type StyleInfo,
} from "@/lib/utils/kml";

const ARRAY_TAGS = new Set([
	"Activity",
	"Lap",
	"Track",
	"Trackpoint",
	"Course",
	"CoursePoint",
]);

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	removeNSPrefix: true,
	trimValues: true,
	isArray: (tagName) => ARRAY_TAGS.has(tagName),
});

const TRACK_STYLE = "#track";

interface TcxPosition {
	LatitudeDegrees?: unknown;
	LongitudeDegrees?: unknown;
}

interface TcxTrackpoint {
	Time?: unknown;
	Position?: TcxPosition;
	AltitudeMeters?: unknown;
	DistanceMeters?: unknown;
	HeartRateBpm?: { Value?: unknown };
}

interface TcxTrack {
	Trackpoint?: TcxTrackpoint[];
}

interface TcxLap {
	Track?: TcxTrack[];
}

interface TcxActivity {
	"@_Sport"?: string;
	Id?: unknown;
	Lap?: TcxLap[];
}

interface TcxCoursePoint {
	Name?: unknown;
	PointType?: unknown;
	Position?: TcxPosition;
}

interface TcxCourse {
	Name?: unknown;
	Track?: TcxTrack[];
	CoursePoint?: TcxCoursePoint[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	return value as Record<string, unknown>;
}

function num(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function text(value: unknown): string {
	if (typeof value === "string") return value.trim();
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return "";
}

function positionOf(
	position: TcxPosition | undefined,
): [number, number] | null {
	const lat = num(position?.LatitudeDegrees);
	const lng = num(position?.LongitudeDegrees);
	if (lat === null || lng === null) return null;
	if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
	return [lng, lat];
}

function trackpointsOf(tracks: TcxTrack[] | undefined): TcxTrackpoint[] {
	const points: TcxTrackpoint[] = [];
	for (const track of tracks ?? []) {
		for (const point of track.Trackpoint ?? []) points.push(point);
	}
	return points;
}

function coordinatesOf(points: TcxTrackpoint[]): [number, number][] {
	const coords: [number, number][] = [];
	for (const point of points) {
		const position = positionOf(point.Position);
		if (position) coords.push(position);
	}
	return coords;
}

function formatDistance(meters: number): string {
	if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
	return `${Math.round(meters)} m`;
}

function describeTrack(points: TcxTrackpoint[], count: number): string {
	const lines = [`${count} points`];
	const start = text(points[0]?.Time);
	const end = text(points.at(-1)?.Time);
	if (start) lines.push(end && end !== start ? `${start} – ${end}` : start);

	let distance: number | null = null;
	for (const point of points) {
		const value = num(point.DistanceMeters);
		if (value !== null) distance = value;
	}
	if (distance !== null) lines.push(formatDistance(distance));

	const heartRates = points
		.map((point) => num(point.HeartRateBpm?.Value))
		.filter((value): value is number => value !== null);
	if (heartRates.length > 0) {
		const average = Math.round(
			heartRates.reduce((sum, value) => sum + value, 0) / heartRates.length,
		);
		lines.push(`Heart rate avg ${average} bpm`);
	}
	return lines.join("\n");
}

function pushLine(
	features: GeoJSON.Feature[],
	name: string,
	line: { description: string; coords: [number, number][] },
): number {
	const { description, coords } = line;
	const id = features.length;
	const geometry: GeoJSON.Geometry =
		coords.length === 1
			? { type: "Point", coordinates: coords[0] }
			: { type: "LineString", coordinates: coords };
	features.push({
		type: "Feature",
		id,
		properties: { name, description, styleUrl: TRACK_STYLE },
		geometry,
	});
	return id;
}

function activityFeatures(
	activities: TcxActivity[],
	features: GeoJSON.Feature[],
): KMLFolder | null {
	const indices: number[] = [];
	activities.forEach((activity, index) => {
		const points = (activity.Lap ?? []).flatMap((lap) =>
			trackpointsOf(lap.Track),
		);
		const coords = coordinatesOf(points);
		if (coords.length === 0) return;
		const sport = activity["@_Sport"] || "Activity";
		const id = text(activity.Id);
		const name = id ? `${sport} · ${id}` : `${sport} ${index + 1}`;
		indices.push(
			pushLine(features, name, {
				description: describeTrack(points, coords.length),
				coords,
			}),
		);
	});
	if (indices.length === 0) return null;
	return { name: "Activities", featureIndices: indices, children: [] };
}

function courseFeatures(
	courses: TcxCourse[],
	features: GeoJSON.Feature[],
): KMLFolder | null {
	const indices: number[] = [];
	courses.forEach((course, index) => {
		const points = trackpointsOf(course.Track);
		const coords = coordinatesOf(points);
		const name = text(course.Name) || `Course ${index + 1}`;
		if (coords.length > 0) {
			indices.push(
				pushLine(features, name, {
					description: describeTrack(points, coords.length),
					coords,
				}),
			);
		}
		for (const coursePoint of course.CoursePoint ?? []) {
			const position = positionOf(coursePoint.Position);
			if (!position) continue;
			const pointName = text(coursePoint.Name) || text(coursePoint.PointType);
			indices.push(
				pushLine(features, pointName || name, {
					description: text(coursePoint.PointType),
					coords: [position],
				}),
			);
		}
	});
	if (indices.length === 0) return null;
	return { name: "Courses", featureIndices: indices, children: [] };
}

function trackStyle(): StyleInfo {
	return {
		lineColor: DEFAULT_COLOR,
		lineOpacity: 1,
		lineWidth: 3,
		polyColor: DEFAULT_COLOR,
		polyOpacity: 0.9,
		iconUrl: null,
	};
}

export function tcxToGeoJSON(xml: string): GeoDocument {
	let parsed: unknown;
	try {
		parsed = parser.parse(xml);
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`Could not read TCX: ${detail}`);
	}

	const root = asRecord(asRecord(parsed)?.TrainingCenterDatabase);
	if (!root) throw new Error("Not a TCX file");

	const activities = asRecord(root.Activities)?.Activity as
		| TcxActivity[]
		| undefined;
	const courses = asRecord(root.Courses)?.Course as TcxCourse[] | undefined;
	const features: GeoJSON.Feature[] = [];
	const folders: KMLFolder[] = [];
	const activityFolder = activityFeatures(activities ?? [], features);
	const courseFolder = courseFeatures(courses ?? [], features);
	if (activityFolder) folders.push(activityFolder);
	if (courseFolder) folders.push(courseFolder);

	const styleMap = new Map<string, StyleInfo>();
	styleMap.set(TRACK_STYLE, trackStyle());

	return {
		geojson: { type: "FeatureCollection", features },
		styleMap,
		folders,
		rootFeatureIndices: [],
	};
}
