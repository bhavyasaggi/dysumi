export interface HarEntry {
	index: number;
	method: string;
	url: string;
	filename: string;
	path: string;
	domain: string;
	status: number;
	statusText: string;
	size: number;
	transferSize: number;
	time: number;
	startOffset: number;
	startedDateTime: string;
	timings: HarTimings;
	requestHeaders: HarHeader[];
	responseHeaders: HarHeader[];
	requestCookies: HarCookie[];
	responseCookies: HarCookie[];
	queryString: HarQueryParam[];
	postData: string | null;
	responseContent: string | null;
}

export interface HarTimings {
	blocked: number;
	dns: number;
	connect: number;
	ssl: number;
	send: number;
	wait: number;
	receive: number;
}

export interface HarHeader {
	name: string;
	value: string;
}

export interface HarCookie {
	name: string;
	value: string;
	domain?: string;
	path?: string;
	expires?: string;
	httpOnly?: boolean;
	secure?: boolean;
}

export interface HarQueryParam {
	name: string;
	value: string;
}

export interface HarPageTiming {
	onContentLoad: number;
	onLoad: number;
}

export interface HarSummary {
	totalEntries: number;
	totalSize: number;
	totalTransferSize: number;
	totalTime: number;
	finishTime: number;
	pageTiming: HarPageTiming | null;
}

function clampTiming(v: number): number {
	return v < 0 ? 0 : v;
}

function extractDomain(url: string): string {
	try {
		return new URL(url).host;
	} catch {
		return url;
	}
}

function extractPath(url: string): string {
	try {
		const u = new URL(url);
		return u.pathname + u.search;
	} catch {
		return url;
	}
}

function extractFilename(url: string): string {
	try {
		const u = new URL(url);
		const parts = u.pathname.split("/");
		const last = parts[parts.length - 1].trim()
			? parts[parts.length - 1]
			: parts[parts.length - 2];
		const filename = (last || "") + u.search;
		return filename || u.href;
	} catch {
		return url || "N/A";
	}
}

function parseTimings(raw: Record<string, number>): HarTimings {
	return {
		blocked: clampTiming(raw.blocked ?? 0),
		dns: clampTiming(raw.dns ?? 0),
		connect: clampTiming(raw.connect ?? 0),
		ssl: clampTiming(raw.ssl ?? 0),
		send: clampTiming(raw.send ?? 0),
		wait: clampTiming(raw.wait ?? 0),
		receive: clampTiming(raw.receive ?? 0),
	};
}

function resolveTransferSize(
	transferSize: number,
	bodySize: number,
): number {
	if (transferSize > -1) return transferSize;
	if (bodySize > -1) return bodySize;
	return 0;
}

function resolveUncompressedSize(
	contentSize: number,
	transferSize: number,
	bodySize: number,
): number {
	if (contentSize > 0) return contentSize;
	if (transferSize > -1) return transferSize;
	if (bodySize > -1) return bodySize;
	return 0;
}

function parseEntry(
	// biome-ignore lint/suspicious/noExplicitAny: HAR JSON has no static type
	e: any,
	index: number,
): HarEntry {
	const req = e.request ?? {};
	const res = e.response ?? {};
	const content = res.content ?? {};

	const contentSize: number = content.size ?? 0;
	const rawTransferSize: number = res._transferSize ?? -1;
	const rawBodySize: number = res.bodySize ?? -1;
	const transferSize = resolveTransferSize(rawTransferSize, rawBodySize);
	const size = resolveUncompressedSize(contentSize, rawTransferSize, rawBodySize);
	const timings = parseTimings(e.timings ?? {});

	const time: number =
		e.time ?? Object.values(timings).reduce((a: number, b: number) => a + b, 0);

	return {
		index,
		method: req.method ?? "GET",
		url: req.url ?? "",
		filename: extractFilename(req.url ?? ""),
		path: extractPath(req.url ?? ""),
		domain: extractDomain(req.url ?? ""),
		startOffset: 0,
		status: res.status ?? 0,
		statusText: res.statusText ?? "",
		size,
		transferSize,
		time,
		startedDateTime: e.startedDateTime ?? "",
		timings,
		requestHeaders: req.headers ?? [],
		responseHeaders: res.headers ?? [],
		requestCookies: req.cookies ?? [],
		responseCookies: res.cookies ?? [],
		queryString: req.queryString ?? [],
		postData: req.postData?.text ?? null,
		responseContent: content.text ?? null,
	};
}

const EMPTY_SUMMARY: HarSummary = {
	totalEntries: 0,
	totalSize: 0,
	totalTransferSize: 0,
	totalTime: 0,
	finishTime: 0,
	pageTiming: null,
};

function computeStartOffsets(
	entries: HarEntry[],
	// biome-ignore lint/suspicious/noExplicitAny: HAR JSON has no static type
	rawEntries: any[],
): number {
	if (entries.length === 0) return 0;

	const firstStart = new Date(entries[0].startedDateTime).getTime();
	let lastEnd = firstStart;

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		const raw = rawEntries[i];
		const start = new Date(entry.startedDateTime).getTime();
		entry.startOffset = start - firstStart;
		const queueing =
			raw?.timings?._blocked_queueing ?? raw?.timings?._queued ?? 0;
		const end = start + entry.time + (queueing > 0 ? queueing : 0);
		if (end > lastEnd) lastEnd = end;
	}

	return lastEnd - firstStart;
}

function parsePageTimings(
	// biome-ignore lint/suspicious/noExplicitAny: HAR JSON has no static type
	log: any,
): HarPageTiming | null {
	const pages = log.pages;
	if (!Array.isArray(pages) || pages.length === 0) return null;

	let onContentLoad = Number.POSITIVE_INFINITY;
	let onLoad = Number.POSITIVE_INFINITY;

	for (const page of pages) {
		const pt = page.pageTimings;
		if (!pt) continue;
		if (pt.onContentLoad != null && pt.onContentLoad > 0) {
			onContentLoad = Math.min(onContentLoad, pt.onContentLoad);
		}
		if (pt.onLoad != null && pt.onLoad > 0) {
			onLoad = Math.min(onLoad, pt.onLoad);
		}
	}

	if (onContentLoad === Number.POSITIVE_INFINITY && onLoad === Number.POSITIVE_INFINITY) {
		return null;
	}

	return {
		onContentLoad: onContentLoad === Number.POSITIVE_INFINITY ? 0 : onContentLoad,
		onLoad: onLoad === Number.POSITIVE_INFINITY ? 0 : onLoad,
	};
}

export function parseHar(source: string): {
	entries: HarEntry[];
	summary: HarSummary;
} {
	const raw = JSON.parse(source);
	const log = raw?.log;
	if (!log?.entries) {
		return { entries: [], summary: EMPTY_SUMMARY };
	}

	const rawEntries = log.entries;
	const entries: HarEntry[] = rawEntries.map(
		// biome-ignore lint/suspicious/noExplicitAny: HAR JSON has no static type
		(e: any, i: number) => parseEntry(e, i),
	);

	const finishTime = computeStartOffsets(entries, rawEntries);
	const pageTiming = parsePageTimings(log);

	let totalSize = 0;
	let totalTransferSize = 0;

	for (const entry of entries) {
		totalSize += entry.size;
		totalTransferSize += entry.transferSize;
	}

	return {
		entries,
		summary: {
			totalEntries: entries.length,
			totalSize,
			totalTransferSize,
			totalTime: finishTime,
			finishTime,
			pageTiming,
		},
	};
}

function roundOff(value: number, decimal = 1): number {
	const base = 10 ** decimal;
	return Math.round(value * base) / base;
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${roundOff(bytes)} B`;
	if (bytes < 1024 ** 2) return `${roundOff(bytes / 1024)} KB`;
	return `${roundOff(bytes / 1024 ** 2)} MB`;
}

export function formatTime(ms: number): string {
	if (ms < 1) return "<1 ms";
	if (ms < 1000) return `${Math.round(ms)} ms`;
	if (ms < 60000) return `${Math.ceil(ms / 10) / 100} s`;
	return `${Math.round(ms / 60000)} m`;
}

export function statusColor(status: number): string {
	if (status === 0) return "gray";
	if (status < 300) return "green";
	if (status < 400) return "blue";
	if (status < 500) return "yellow";
	return "red";
}

export const METHOD_COLORS: Record<string, string> = {
	GET: "blue",
	POST: "green",
	PUT: "orange",
	PATCH: "yellow",
	DELETE: "red",
	HEAD: "gray",
	OPTIONS: "cyan",
	CONNECT: "grape",
};

export function tryPrettyJson(text: string): string {
	try {
		return JSON.stringify(JSON.parse(text), null, 2);
	} catch {
		return text;
	}
}
