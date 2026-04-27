import type { languages } from "monaco-editor";

export const monarchGraphQL: languages.IMonarchLanguage = {
	defaultToken: "",
	tokenPostfix: ".graphql",

	keywords: [
		"query",
		"mutation",
		"subscription",
		"fragment",
		"on",
		"type",
		"interface",
		"union",
		"enum",
		"input",
		"scalar",
		"extend",
		"schema",
		"directive",
		"implements",
		"repeatable",
	],

	builtinTypes: ["String", "Int", "Float", "Boolean", "ID"],

	operators: ["=", "!", ":", "@", "|", "&", "..."],

	tokenizer: {
		root: [
			// Comments
			[/#.*$/, "comment"],

			// Strings
			[/"/, "string", "@string"],
			[/"""/, "string", "@blockString"],

			// Numbers
			[/-?\d+\.\d+([eE][+-]?\d+)?/, "number.float"],
			[/-?\d+/, "number"],

			// Booleans and null
			[/\b(true|false|null)\b/, "keyword"],

			// Directives
			[/@\w+/, "annotation"],

			// Variables
			[/\$\w+/, "variable"],

			// Type names (capitalized)
			[
				/[A-Z]\w*/,
				{
					cases: {
						"@builtinTypes": "type.builtin",
						"@default": "type.identifier",
					},
				},
			],

			// Keywords and identifiers
			[
				/[a-z_]\w*/,
				{
					cases: {
						"@keywords": "keyword",
						"@default": "identifier",
					},
				},
			],

			// Brackets
			[/[{}()[\]]/, "@brackets"],

			// Spread operator
			[/\.\.\./, "operator"],

			// Operators
			[/[=!:|&]/, "operator"],

			// Whitespace
			[/\s+/, "white"],
		],

		string: [
			[/[^"\\]+/, "string"],
			[/\\./, "string.escape"],
			[/"/, "string", "@pop"],
		],

		blockString: [
			[/"""/, "string", "@pop"],
			[/./, "string"],
		],
	},
};
