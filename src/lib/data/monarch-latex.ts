import type { languages } from "monaco-editor";

export const monarchLatex: languages.IMonarchLanguage = {
	defaultToken: "",
	tokenPostfix: ".latex",

	brackets: [
		{ open: "{", close: "}", token: "delimiter.curly" },
		{ open: "[", close: "]", token: "delimiter.square" },
		{ open: "(", close: ")", token: "delimiter.parenthesis" },
	],

	builtin: [
		"documentclass",
		"usepackage",
		"begin",
		"end",
		"title",
		"author",
		"date",
		"maketitle",
		"tableofcontents",
		"section",
		"subsection",
		"subsubsection",
		"chapter",
		"part",
		"paragraph",
		"subparagraph",
		"item",
		"textbf",
		"textit",
		"texttt",
		"textsc",
		"textrm",
		"textsf",
		"emph",
		"underline",
		"footnote",
		"label",
		"ref",
		"eqref",
		"pageref",
		"cite",
		"bibliography",
		"bibliographystyle",
		"includegraphics",
		"caption",
		"input",
		"include",
		"newcommand",
		"renewcommand",
		"providecommand",
		"newenvironment",
		"renewenvironment",
		"setlength",
		"addtolength",
		"setcounter",
		"addtocounter",
		"newcounter",
		"newlength",
		"pagestyle",
		"thispagestyle",
		"hspace",
		"vspace",
		"hfill",
		"vfill",
		"noindent",
		"centering",
		"raggedright",
		"raggedleft",
		"href",
		"url",
		"thanks",
	],

	tokenizer: {
		root: [
			// \begin{env} / \end{env}
			[
				/(\\begin)(\s*)(\{)([\w\-*@]+)(\})/,
				["keyword.predefined", "white", "@brackets", "tag", "@brackets"],
			],
			[
				/(\\end)(\s*)(\{)([\w\-*@]+)(\})/,
				["keyword.predefined", "white", "@brackets", "tag", "@brackets"],
			],

			// Display math $$...$$ and \[...\]
			[/\$\$/, "string.math", "@mathDisplay"],
			[/\\\[/, "string.math", "@mathDisplay"],

			// Inline math $...$ and \(...\)
			[/\$(?!\$)/, "string.math", "@mathInline"],
			[/\\\(/, "string.math", "@mathInline"],

			// Escaped special characters like \\ \& \% \$ etc.
			[/\\[^a-zA-Z@]/, "keyword"],

			// Commands
			[
				/\\([a-zA-Z@]+)\*?/,
				{
					cases: {
						"$1@builtin": "keyword.predefined",
						"@default": "keyword",
					},
				},
			],

			// Comments
			[/%.*$/, "comment"],

			// Brackets
			[/[{}()[\]]/, "@brackets"],

			// Macro arguments #1 #2 etc.
			[/#+\d/, "variable.predefined"],

			// Dimensions like 2.5em, 10pt, 1in
			[
				/-?(?:\d+(?:\.\d+)?|\.\d+)\s*(?:em|ex|pt|pc|sp|cm|mm|in|bp|dd|cc|mu)/,
				"number",
			],

			// Numbers
			[/\d+/, "number"],

			// Text
			[/[^\\%${}()[\]#\d]+/, ""],
		],

		mathInline: [
			[/\\\)/, "string.math", "@pop"],
			[/\$/, "string.math", "@pop"],
			[/\\[a-zA-Z@]+/, "keyword"],
			[/\\[^a-zA-Z@]/, "keyword"],
			[/[^\\$)]+/, "string.math"],
		],

		mathDisplay: [
			[/\\\]/, "string.math", "@pop"],
			[/\$\$/, "string.math", "@pop"],
			[/\\[a-zA-Z@]+/, "keyword"],
			[/\\[^a-zA-Z@]/, "keyword"],
			[/[^\\$\]]+/, "string.math"],
		],
	},
};
