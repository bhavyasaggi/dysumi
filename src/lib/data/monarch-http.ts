import type { languages } from "monaco-editor";

export const monarchHttp: languages.IMonarchLanguage = {
	defaultToken: "",
	tokenPostfix: ".http",

	methods: [
		"GET",
		"POST",
		"PUT",
		"DELETE",
		"PATCH",
		"HEAD",
		"OPTIONS",
		"CONNECT",
		"TRACE",
		"PROPFIND",
		"PROPPATCH",
		"MKCOL",
		"COPY",
		"MOVE",
		"LOCK",
		"UNLOCK",
		"CHECKOUT",
		"CHECKIN",
		"REPORT",
		"MERGE",
		"MKACTIVITY",
		"MKWORKSPACE",
		"VERSION-CONTROL",
		"BASELINE-CONTROL",
		"MKCALENDAR",
		"ACL",
		"SEARCH",
		"GRAPHQL",
	],

	tokenizer: {
		root: [
			// Region separator: ###
			[/^\s*#{3,}.*$/, "comment.separator"],

			// Metadata directives: # @name value, // @name value
			[
				/^(\s*(?:#+|\/{2,})\s+)(@\w[\w-]*)(\s+)(\S.*)?$/,
				["comment", "annotation", "comment", "string"],
			],
			[
				/^(\s*(?:#+|\/{2,})\s+)(@\w[\w-]*)(\s*)$/,
				["comment", "annotation", "comment"],
			],

			// Comments: # or //
			[/^\s*#.*$/, "comment"],
			[/^\s*\/{2}.*$/, "comment"],

			// Variable definition: @name = value
			[
				/^(\s*@)([\w][\w.-]*)(\s*:?=\s*)(.*)$/,
				["keyword", "variable", "operator", "string"],
			],

			// Request line: METHOD URL [HTTP/version]
			[
				/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE|PROPFIND|PROPPATCH|MKCOL|COPY|MOVE|LOCK|UNLOCK|CHECKOUT|CHECKIN|REPORT|MERGE|MKACTIVITY|MKWORKSPACE|VERSION-CONTROL|BASELINE-CONTROL|MKCALENDAR|ACL|SEARCH|GRAPHQL)\s+/i,
				{ token: "keyword", next: "@requestUrl" },
			],

			// Response status line: HTTP/1.1 200 OK
			[
				/^(\s*HTTP\/\S+)(\s+)(\d{3})(\s+)(.*)/,
				["keyword", "", "number", "", "string"],
			],

			// URL-only line (implicit GET)
			[/^https?:\/\//, { token: "string.url", next: "@url" }],

			// Query parameter continuation: ?key=value or &key=value
			[
				/^(\s*)([?&])([^=\s]+)(=)(.*)/,
				["", "operator", "variable", "operator", "string"],
			],

			// File import: < ./file.json
			[/^(<@?\w*)\s+(.+)$/, ["keyword", "string"]],

			// Header: Name: Value
			[
				/^([!#$%&'*+\-.^_`|~\w]+)(\s*:\s*)(.*)/,
				["attribute.name", "operator", "attribute.value"],
			],

			// Handlebars variable {{...}}
			[/\{\{.+?\}\}/, "variable"],

			// Default Body content
			[/./, ""],
		],

		requestUrl: [
			// HTTP version: HTTP/1.1, HTTP/2.0
			[/(HTTP)(\/)([\d.]+)/, ["keyword", "operator", "number"]],
			// Handlebars variables in URL
			[/\{\{.+?\}\}/, "variable"],
			[/\S+/, "string.url"],
			[/$/, "", "@pop"],
		],

		url: [
			[/\{\{.+?\}\}/, "variable"],
			[/\S+/, "string.url"],
			[/$/, "", "@pop"],
		],
	},
};
