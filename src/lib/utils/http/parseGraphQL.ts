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

/**
 * Parse a .graphql/.gql file into an HttpFile using the reference
 * `graphql` parser. Each top-level definition (operation, fragment,
 * type, schema, directive, extension) becomes a separate entry.
 */
export function parseGraphQLFile(source: string): HttpFile {
	let doc: DocumentNode | undefined;
	try {
		doc = parse(source, { noLocation: false });
	} catch {
		return {
			variables: {},
			requests: [
				{
					method: "QUERY",
					url: "",
					headers: {},
					body: source.trim(),
					variables: {},
					meta: {},
				},
			],
		};
	}

	const requests: HttpRequest[] = doc.definitions.map((node) => {
		const { method, title } = categoryForDefinition(node);
		return {
			method,
			title,
			url: "",
			headers: {},
			body: bodyForDefinition(node, source),
			name: nameForDefinition(node),
			variables: {},
			meta: {},
		};
	});

	if (requests.length === 0 && source.trim()) {
		requests.push({
			method: "QUERY",
			url: "",
			headers: {},
			body: source.trim(),
			variables: {},
			meta: {},
		});
	}

	return { variables: {}, requests };
}
