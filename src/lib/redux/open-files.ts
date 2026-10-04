type OpenEntry = { name: string; path: string };

export function pathsAfterDelete(
	files: OpenEntry[],
	options: { path: string; active?: string },
) {
	const next = files.filter(
		(file) =>
			file.path !== options.path && !file.path.startsWith(`${options.path}/`),
	);
	if (next.length === 0) {
		const fresh = {
			name: "Untitled",
			path: `untitled:${Math.random().toString(36).slice(2, 10)}.md`,
		};
		return { openFiles: [fresh], activeFile: fresh.path };
	}
	if (!(options.active && next.some((file) => file.path === options.active))) {
		return { openFiles: next, activeFile: next.at(-1)?.path };
	}
	return { openFiles: next, activeFile: options.active };
}

export function pathsAfterRename(
	files: OpenEntry[],
	options: { path: string; nextPath: string; active?: string },
) {
	const openFiles = files.map((file) => {
		if (
			file.path !== options.path &&
			!file.path.startsWith(`${options.path}/`)
		) {
			return file;
		}
		const path = `${options.nextPath}${file.path.slice(options.path.length)}`;
		return { ...file, path, name: path.split("/").pop() || file.name };
	});
	let activeFile = options.active;
	if (options.active === options.path) activeFile = options.nextPath;
	else if (options.active?.startsWith(`${options.path}/`)) {
		activeFile = `${options.nextPath}${options.active.slice(options.path.length)}`;
	}
	return { openFiles, activeFile };
}
