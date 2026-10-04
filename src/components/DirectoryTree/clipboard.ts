export type DirectoryClipboard = {
	mode: "copy" | "cut";
	entries: Array<{ path: string; name: string; isDirectory: boolean }>;
};

function pathCovers(parent: string, child: string) {
	return child === parent || child.startsWith(`${parent}/`);
}

export function nextClipboard(
	clip: DirectoryClipboard | null,
	options: {
		mode: "copy" | "cut";
		entry: DirectoryClipboard["entries"][number];
	},
) {
	const { mode, entry } = options;
	if (!clip || clip.mode !== mode) return { mode, entries: [entry] };
	if (
		clip.entries.some(
			(item) => item.path !== entry.path && pathCovers(item.path, entry.path),
		)
	) {
		return clip;
	}
	if (clip.entries.some((item) => item.path === entry.path)) {
		const entries = clip.entries.filter((item) => item.path !== entry.path);
		return entries.length > 0 ? { ...clip, entries } : null;
	}
	const entries = clip.entries.filter(
		(item) => !pathCovers(entry.path, item.path),
	);
	return { mode, entries: [...entries, entry] };
}

export function retargetClipboard(
	clip: DirectoryClipboard | null,
	options: { from: string; to: string },
) {
	if (!clip) return null;
	let changed = false;
	const entries = clip.entries.map((entry) => {
		if (
			entry.path !== options.from &&
			!entry.path.startsWith(`${options.from}/`)
		) {
			return entry;
		}
		changed = true;
		const path = `${options.to}${entry.path.slice(options.from.length)}`;
		return { ...entry, path, name: path.split("/").pop() || entry.name };
	});
	return changed ? { ...clip, entries } : clip;
}

export function dropClipboardPath(
	clip: DirectoryClipboard | null,
	path: string,
) {
	if (!clip) return null;
	const entries = clip.entries.filter(
		(entry) => entry.path !== path && !entry.path.startsWith(`${path}/`),
	);
	if (entries.length === clip.entries.length) return clip;
	return entries.length > 0 ? { ...clip, entries } : null;
}

export function pasteLabel(clip: DirectoryClipboard) {
	const [first] = clip.entries;
	if (clip.entries.length === 1 && first) return `Paste ${first.name}`;
	return `Paste ${clip.entries.length} items`;
}

export function clipboardActionLabel(
	clip: DirectoryClipboard | null,
	options: { mode: "copy" | "cut"; path: string },
) {
	const idle = options.mode === "copy" ? "Copy" : "Cut";
	const add = options.mode === "copy" ? "Add to copy" : "Add to cut";
	const remove =
		options.mode === "copy" ? "Remove from copy" : "Remove from cut";
	const included =
		options.mode === "copy" ? "Included in copy" : "Included in cut";
	if (!clip || clip.mode !== options.mode || clip.entries.length === 0) {
		return idle;
	}
	if (clip.entries.some((item) => item.path === options.path)) return remove;
	if (
		clip.entries.some(
			(item) =>
				item.path !== options.path && pathCovers(item.path, options.path),
		)
	) {
		return included;
	}
	return add;
}

export function pasteNotice(count: number) {
	if (count === 0) return { title: "Nothing to paste", tone: "info" as const };
	if (count === 1) return { title: "Pasted 1 item", tone: "success" as const };
	return { title: `Pasted ${count} items`, tone: "success" as const };
}

export function clipboardNotice(
	previous: DirectoryClipboard | null,
	next: DirectoryClipboard | null,
	options: { mode: "copy" | "cut"; name: string; path: string },
) {
	const held =
		previous?.mode === options.mode
			? previous.entries.some((item) => item.path === options.path)
			: false;
	const kept =
		next?.entries.some((item) => item.path === options.path) ?? false;
	if (!previous || previous.mode !== options.mode) {
		return options.mode === "cut"
			? `Cut ${options.name}`
			: `Copied ${options.name}`;
	}
	if (!held && kept) {
		return options.mode === "cut"
			? `Added ${options.name} to cut`
			: `Added ${options.name} to copy`;
	}
	if (held && !kept) return `Removed ${options.name}`;
	return null;
}
