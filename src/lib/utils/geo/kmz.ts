import { strFromU8, unzipSync } from "fflate";

// KMZ is a zip archive. The spec names the main document doc.kml.
export function kmlFromKmz(data: Uint8Array): string {
	let files: Record<string, Uint8Array>;
	try {
		files = unzipSync(data);
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to extract KMZ: ${detail}`);
	}

	const names = Object.keys(files);
	const preferred =
		names.find((name) => /(^|\/)doc\.kml$/i.test(name)) ??
		names.find((name) => name.toLowerCase().endsWith(".kml"));
	if (!preferred) {
		throw new Error("No KML file found inside KMZ archive");
	}
	return strFromU8(files[preferred]);
}
