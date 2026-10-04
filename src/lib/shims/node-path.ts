const sep = "/";

function isAbsolute(value: string): boolean {
	return value.startsWith("/") || value.startsWith("\\");
}

function normalize(value: string): string {
	const absolute = isAbsolute(value);
	const parts: string[] = [];
	for (const bit of value.split(/[/\\]+/)) {
		if (!bit || bit === ".") continue;
		if (bit === "..") {
			if (parts.length > 0 && parts[parts.length - 1] !== "..") parts.pop();
			else if (!absolute) parts.push("..");
			continue;
		}
		parts.push(bit);
	}
	const body = parts.join(sep);
	if (absolute) return body.length > 0 ? `${sep}${body}` : sep;
	return body.length > 0 ? body : ".";
}

function join(...parts: Array<string | undefined>): string {
	const present = parts.filter(
		(part): part is string => typeof part === "string" && part.length > 0,
	);
	if (present.length === 0) return ".";
	let acc = present[0] ?? ".";
	for (const part of present.slice(1)) {
		acc = isAbsolute(part) ? part : `${acc}${sep}${part}`;
	}
	return normalize(acc);
}

function dirname(value: string): string {
	const normalized = normalize(value);
	const index = normalized.lastIndexOf(sep);
	if (index < 0) return ".";
	if (index === 0) return sep;
	return normalized.slice(0, index);
}

function basename(value: string, ext = ""): string {
	const normalized = normalize(value);
	const index = normalized.lastIndexOf(sep);
	const base = index < 0 ? normalized : normalized.slice(index + 1);
	if (ext.length > 0 && base.endsWith(ext)) return base.slice(0, -ext.length);
	return base;
}

function extname(value: string): string {
	const base = basename(value);
	const index = base.lastIndexOf(".");
	if (index <= 0) return "";
	return base.slice(index);
}

function resolve(...parts: string[]): string {
	let result = sep;
	for (const part of parts) {
		if (!part) continue;
		result = isAbsolute(part) ? normalize(part) : normalize(join(result, part));
	}
	return result;
}

function relative(from: string, to: string): string {
	const fromParts = normalize(from)
		.split(sep)
		.filter((part) => part.length > 0);
	const toParts = normalize(to)
		.split(sep)
		.filter((part) => part.length > 0);
	while (
		fromParts.length > 0 &&
		toParts.length > 0 &&
		fromParts[0] === toParts[0]
	) {
		fromParts.shift();
		toParts.shift();
	}
	const segments = [...fromParts.map(() => ".."), ...toParts];
	return segments.length > 0 ? segments.join(sep) : ".";
}

const path = {
	sep,
	join,
	resolve,
	dirname,
	basename,
	extname,
	normalize,
	isAbsolute,
	relative,
	posix: undefined as unknown,
	win32: undefined as unknown,
};
path.posix = path;
path.win32 = path;

export {
	basename,
	dirname,
	extname,
	isAbsolute,
	join,
	normalize,
	relative,
	resolve,
	sep,
};
export default path;
