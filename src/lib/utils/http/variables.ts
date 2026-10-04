const PLACEHOLDER_RE = /\{\{\s*([^{}\s]+)\s*\}\}/gu;

/**
 * Replace `{{name}}` placeholders with values from `variables`.
 * Values may themselves contain placeholders. Unresolved names are left in place.
 */
export function applyVariables(
	text: string,
	variables: Record<string, string>,
): string {
	let current = text;
	for (let pass = 0; pass < 8; pass += 1) {
		const next = current.replace(PLACEHOLDER_RE, (match, key: string) => {
			if (!(key in variables)) return match;
			return variables[key] ?? "";
		});
		if (next === current) return current;
		current = next;
	}
	return current;
}

/** Resolve placeholders inside the variable values themselves. */
export function resolveScope(
	variables: Record<string, string>,
): Record<string, string> {
	const resolved: Record<string, string> = {};
	for (const key of Object.keys(variables)) {
		resolved[key] = applyVariables(variables[key] ?? "", variables);
	}
	return resolved;
}
