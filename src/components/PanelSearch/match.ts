export const NAME_MATCH_LIMIT = 100;

export type NameIndexEntry = { path: string; lower: string };

export function nameIndex(paths: string[]) {
	return paths.map((path) => ({ path, lower: path.toLowerCase() }));
}

export function matchFileNames(
	index: NameIndexEntry[],
	query: string,
	options: { limit: number },
) {
	const needle = query.trim().toLowerCase();
	if (!needle) return { paths: [] as string[], total: 0 };
	const paths: string[] = [];
	let total = 0;
	for (const entry of index) {
		if (!entry.lower.includes(needle)) continue;
		total += 1;
		if (paths.length < options.limit) paths.push(entry.path);
	}
	return { paths, total };
}
