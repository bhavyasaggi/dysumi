const UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < UNITS.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const shown = unit === 0 || value >= 10 ? value.toFixed(0) : value.toFixed(1);
	return `${shown} ${UNITS[unit]}`;
}

export function formatRemaining(ms: number, done: boolean): string {
	if (done) return "Done";
	if (!Number.isFinite(ms)) return "Time remaining unknown";
	const seconds = Math.max(0, Math.round(ms / 1000));
	const days = Math.floor(seconds / 86_400);
	const hours = Math.floor((seconds % 86_400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const rest = seconds % 60;
	if (days > 1) return `${days} days remaining`;
	if (hours > 0) return `${hours}h ${minutes}m remaining`;
	if (minutes > 0) return `${minutes}m ${rest}s remaining`;
	return `${rest}s remaining`;
}

export type PreviewKind = "image" | "audio" | "video" | "text";

const PREVIEW_EXT: Record<string, PreviewKind> = {
	png: "image",
	jpg: "image",
	jpeg: "image",
	gif: "image",
	webp: "image",
	svg: "image",
	avif: "image",
	mp3: "audio",
	wav: "audio",
	ogg: "audio",
	m4a: "audio",
	flac: "audio",
	mp4: "video",
	webm: "video",
	ogv: "video",
	mov: "video",
	txt: "text",
	md: "text",
	json: "text",
	log: "text",
	csv: "text",
	html: "text",
	css: "text",
	js: "text",
	ts: "text",
};

export function previewKind(name: string, type: string): PreviewKind | null {
	if (type.startsWith("image/")) return "image";
	if (type.startsWith("audio/")) return "audio";
	if (type.startsWith("video/")) return "video";
	if (type.startsWith("text/") || type === "application/json") return "text";
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	return PREVIEW_EXT[ext] ?? null;
}
