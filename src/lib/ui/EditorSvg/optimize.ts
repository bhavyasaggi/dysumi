import { optimize, type PluginConfig } from "svgo/browser";
import { SVG_PLUGINS, type SvgOptimizeSettings } from "./plugins";

export function optimizeSvg(
	svg: string,
	settings: SvgOptimizeSettings,
): string {
	const plugins: PluginConfig[] = [];
	for (const plugin of SVG_PLUGINS) {
		if (!settings.plugins[plugin.id]) continue;
		const floatPrecision =
			plugin.id === "cleanupNumericValues" && settings.floatPrecision === 0
				? 1
				: settings.floatPrecision;
		plugins.push({
			name: plugin.id,
			params: {
				floatPrecision,
				transformPrecision: settings.transformPrecision,
			},
		} as PluginConfig);
	}

	const result = optimize(svg, {
		multipass: settings.multipass,
		floatPrecision: settings.floatPrecision,
		plugins,
		js2svg: {
			indent: 2,
			pretty: settings.pretty,
		},
	});
	return result.data;
}

export function utf8Size(value: string): number {
	return new TextEncoder().encode(value).length;
}

export async function gzipSize(value: string): Promise<number | null> {
	if (typeof CompressionStream === "undefined") return null;
	const stream = new Blob([value])
		.stream()
		.pipeThrough(new CompressionStream("gzip"));
	const buffer = await new Response(stream).arrayBuffer();
	return buffer.byteLength;
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatSaving(before: number, after: number): string {
	if (before <= 0) return "0%";
	const percent = ((after - before) / before) * 100;
	const sign = percent > 0 ? "+" : "−";
	return `${sign}${Math.abs(percent).toFixed(1)}%`;
}

export function readSvgDimensions(svg: string): string | null {
	if (typeof DOMParser === "undefined") return null;
	const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
	const root = doc.documentElement;
	if (root.nodeName.toLowerCase() !== "svg") return null;

	const width = Number.parseFloat(root.getAttribute("width") ?? "");
	const height = Number.parseFloat(root.getAttribute("height") ?? "");
	if (Number.isFinite(width) && Number.isFinite(height)) {
		return `${trimNumber(width)} × ${trimNumber(height)}`;
	}

	const parts = (root.getAttribute("viewBox") ?? "")
		.trim()
		.split(/[\s,]+/)
		.map(Number);
	if (parts.length === 4 && parts.every((part) => Number.isFinite(part))) {
		return `${trimNumber(parts[2])} × ${trimNumber(parts[3])}`;
	}
	return null;
}

function trimNumber(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
