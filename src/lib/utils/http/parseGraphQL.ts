import {
	type DefinitionNode,
	type DocumentNode,
	Kind,
	parse,
	print,
} from "graphql";
import type { HttpFile, HttpRequest } from "./types.d";

/** Map a GraphQL definition node to a category and kind sublabel. */
function categoryForDefinition(node: DefinitionNode): {
	method: string;
	title?: string;
} {
	switch (node.kind) {
		case Kind.OPERATION_DEFINITION:
			return { method: (node.operation ?? "query").toUpperCase() };
		case Kind.FRAGMENT_DEFINITION:
			return { method: "FRAGMENT" };
		case Kind.SCHEMA_DEFINITION:
			return { method: "SCHEMA" };
		case Kind.SCHEMA_EXTENSION:
			return { method: "EXTEND", title: "Schema" };
		case Kind.SCALAR_TYPE_DEFINITION:
			return { method: "SCHEMA", title: "Scalar" };
		case Kind.OBJECT_TYPE_DEFINITION:
			return { method: "SCHEMA", title: "Type" };
		case Kind.INTERFACE_TYPE_DEFINITION:
			return { method: "SCHEMA", title: "Interface" };
		case Kind.UNION_TYPE_DEFINITION:
			return { method: "SCHEMA", title: "Union" };
		case Kind.ENUM_TYPE_DEFINITION:
			return { method: "SCHEMA", title: "Enum" };
		case Kind.INPUT_OBJECT_TYPE_DEFINITION:
			return { method: "SCHEMA", title: "Input" };
		case Kind.DIRECTIVE_DEFINITION:
			return { method: "SCHEMA", title: "Directive" };
		case Kind.SCALAR_TYPE_EXTENSION:
			return { method: "EXTEND", title: "Scalar" };
		case Kind.OBJECT_TYPE_EXTENSION:
			return { method: "EXTEND", title: "Type" };
		case Kind.INTERFACE_TYPE_EXTENSION:
			return { method: "EXTEND", title: "Interface" };
		case Kind.UNION_TYPE_EXTENSION:
			return { method: "EXTEND", title: "Union" };
		case Kind.ENUM_TYPE_EXTENSION:
			return { method: "EXTEND", title: "Enum" };
		case Kind.INPUT_OBJECT_TYPE_EXTENSION:
			return { method: "EXTEND", title: "Input" };
		default:
			return { method: "QUERY" };
	}
}

/** Extract the user-facing name from a definition node, if it has one. */
function nameForDefinition(node: DefinitionNode): string | undefined {
	if ("name" in node && node.name) return node.name.value;
	return undefined;
}

/**
 * Extract the original source text for a definition node.
 * Falls back to `print()` if location info is missing.
 */
function bodyForDefinition(node: DefinitionNode, source: string): string {
	if (node.loc) {
		return source.slice(node.loc.start, node.loc.end);
	}
	return print(node);
}

const ASSIGNMENT_RE =
	/^\s*(?:#+\s*)?@(?<key>[^\s=:]+)\s*=\s*"?(?<value>.*?)"?\s*$/u;

interface Assignment {
	/** Index of the next kept line in the stripped source. */
	line: number;
	key: string;
	value: string;
}

function lineAt(source: string, index: number): number {
	let line = 0;
	const end = Math.min(index, source.length);
	for (let cursor = 0; cursor < end; cursor += 1) {
		if (source.charCodeAt(cursor) === 10) line += 1;
	}
	return line;
}

/**
 * Lift `@key = value` lines, including `# @key = value` comments, out of a
 * GraphQL document. Lines inside block strings stay in the document.
 */
function stripAssignments(source: string): {
	text: string;
	assignments: Assignment[];
} {
	const assignments: Assignment[] = [];
	const kept: string[] = [];
	let block = false;
	for (const line of source.split(/\r?\n/u)) {
		const fences = line.split('"""').length - 1;
		const opensBlock = !block && fences % 2 === 1;
		const match = block || opensBlock ? null : line.match(ASSIGNMENT_RE);
		if (match?.groups?.key) {
			assignments.push({
				line: kept.length,
				key: match.groups.key,
				value: (match.groups.value ?? "").trim(),
			});
			continue;
		}
		if (fences % 2 === 1) block = !block;
		kept.push(line);
	}
	return { text: kept.join("\n"), assignments };
}

function variablesFrom(assignments: Assignment[]): Record<string, string> {
	const variables: Record<string, string> = {};
	for (const assignment of assignments) {
		variables[assignment.key] = assignment.value;
	}
	return variables;
}

function fallbackFile(text: string, assignments: Assignment[]): HttpFile {
	const variables = variablesFrom(assignments);
	if (!text.trim()) return { variables, requests: [] };
	return {
		variables,
		requests: [
			{
				method: "QUERY",
				url: "",
				headers: {},
				body: text.trim(),
				variables,
				variableScope: { ...variables },
				meta: {},
			},
		],
	};
}

function requestsFromDocument(
	text: string,
	doc: DocumentNode,
	assignments: Assignment[],
): HttpFile {
	const fileVariables: Record<string, string> = {};
	const running: Record<string, string> = {};
	const requests: HttpRequest[] = [];
	let index = 0;

	function takeUntil(line: number, into: Record<string, string>) {
		while (index < assignments.length && assignments[index].line <= line) {
			const assignment = assignments[index];
			index += 1;
			if (!assignment) continue;
			into[assignment.key] = assignment.value;
			running[assignment.key] = assignment.value;
		}
	}

	doc.definitions.forEach((node, definitionIndex) => {
		const { method, title } = categoryForDefinition(node);
		const start = node.loc ? lineAt(text, node.loc.start) : 0;
		const end = node.loc ? lineAt(text, node.loc.end) : start;
		const local: Record<string, string> = {};
		if (definitionIndex === 0) {
			const leading: Record<string, string> = {};
			takeUntil(start, leading);
			Object.assign(fileVariables, leading);
		} else {
			takeUntil(start, local);
		}
		takeUntil(end, local);
		requests.push({
			method,
			title,
			url: "",
			headers: {},
			body: bodyForDefinition(node, text),
			name: nameForDefinition(node),
			variables: local,
			variableScope: { ...running },
			meta: {},
		});
	});

	if (requests.length === 0) {
		takeUntil(Number.POSITIVE_INFINITY, fileVariables);
		if (text.trim()) {
			requests.push({
				method: "QUERY",
				url: "",
				headers: {},
				body: text.trim(),
				variables: {},
				variableScope: { ...fileVariables },
				meta: {},
			});
		}
		return { variables: fileVariables, requests };
	}

	const trailing: Record<string, string> = {};
	takeUntil(Number.POSITIVE_INFINITY, trailing);
	const last = requests[requests.length - 1];
	if (last && Object.keys(trailing).length > 0) {
		last.variables = { ...last.variables, ...trailing };
		last.variableScope = { ...last.variableScope, ...trailing };
	}
	return { variables: fileVariables, requests };
}

/**
 * Parse a .graphql/.gql file into an HttpFile using the reference
 * `graphql` parser. Each top-level definition (operation, fragment,
 * type, schema, directive, extension) becomes a separate entry.
 * `@key = value` lines and `# @key = value` comments become variables.
 */
export function parseGraphQLFile(source: string): HttpFile {
	const { text, assignments } = stripAssignments(source);
	let doc: DocumentNode | undefined;
	try {
		doc = parse(text, { noLocation: false });
	} catch {
		return fallbackFile(text, assignments);
	}
	return requestsFromDocument(text, doc, assignments);
}
