import type { languages } from "monaco-editor";

const FIELD = String.raw`date2?|status|code|description|comment\d*|account\d+|amount\d*(?:-in|-out)?|currency\d*|balance\d*`;
const fieldToken = new RegExp(String.raw`\b(?:${FIELD})\b`);

export const monarchHledgerRules: languages.IMonarchLanguage = {
	defaultToken: "",
	tokenPostfix: ".rules",
	tokenizer: {
		root: [
			[/^\s*[#;*].*$/, "comment"],
			[
				/^(\s*)(include|encoding|timezone|date-format)(\s+)(\S+)(\s*)$/,
				["", "keyword", "", "string", ""],
			],
			[/^(\s*)(skip)(\s+)(\d+)(\s*)$/, ["", "keyword", "", "number", ""]],
			[/^(\s*)(skip)(\s*)$/, ["", "keyword", ""]],
			[/^(\s*)(separator)(\s+)(\S+)(\s*)$/i, ["", "keyword", "", "string", ""]],
			[
				/^(\s*)(decimal-mark)(\s+)([.,])(\s*)$/,
				["", "keyword", "", "string", ""],
			],
			[
				/^(\s*)(balance-type)(\s+)(={1,2}\*?)(\s*)$/,
				["", "keyword", "", "string", ""],
			],
			[
				/^(\s*)(newest-first|intra-day-reversed|archive|end)(\s*)$/,
				["", "keyword", ""],
			],
			[/^(\s*)(fields)(\s+)/, ["", "keyword", ""], "@fields"],
			[/^(\s*)(source)(\s+)/, ["", "keyword", ""], "@source"],
			[/^(\s*)(if)(\s*)([,|/])/, ["", "keyword", "", "delimiter"], "@table"],
			[/^(\s*)(if)\b/, ["", "keyword"], "@ifBlock"],
			[
				new RegExp(String.raw`^(\s*)(${FIELD})(\s+)`),
				["", "variable", ""],
				"@value",
			],
			[
				/\b(?:include|encoding|timezone|date-format|separator|decimal-mark|balance-type|newest-first|intra-day-reversed|archive|skip|fields|source|if|end)\b/,
				"keyword",
			],
		],
		fields: [
			[/,/, "delimiter"],
			[fieldToken, "variable"],
			[/[#;].*$/, { token: "comment", next: "@pop" }],
			[/$/, { token: "", next: "@pop" }],
			[/[ \t]+/, ""],
			[/[^\s,]+/, "variable"],
		],
		source: [
			[/\*/, "variable"],
			[/\|/, { token: "delimiter", next: "@shell" }],
			[/$/, { token: "", next: "@pop" }],
			[/\s+/, ""],
			[/\S+/, "string"],
		],
		shell: [
			[/$/, { token: "", next: "@pop" }],
			[/.+$/, "string"],
		],
		table: [
			[/^\s*$/, { token: "", next: "@pop" }],
			[/^\s*[#;*].*$/, "comment"],
			[/&&/, "operator"],
			[/[&!]/, "operator"],
			[/%([A-Za-z_][\w-]*)/, "variable"],
			[/[,|/]/, "delimiter"],
			[/[ \t]+/, ""],
			[/[^\s,|/]+/, "string"],
		],
		ifBlock: [
			[/^\s*$/, { token: "", next: "@pop" }],
			[/^\s*[#;*].*$/, "comment"],
			[/&&/, "operator"],
			[/[&!]/, "operator"],
			[/%([A-Za-z_][\w-]*)/, "variable"],
			[/[ \t]+/, ""],
			[/\S+/, "string"],
		],
		value: [
			[/\\\d+/, "number"],
			[/%([A-Za-z_][\w-]*)/, "variable"],
			[/$/, { token: "", next: "@pop" }],
			[/[ \t]+/, ""],
			[/\S+/, "string"],
		],
	},
};
