import { useComputedColorScheme } from "@mantine/core";
import { useThrottledCallback } from "@mantine/hooks";
import Editor, { type EditorProps, type Monaco } from "@monaco-editor/react";
import { monarchGraphQL } from "@/lib/data/monarch-graphql";
import { monarchHttp } from "@/lib/data/monarch-http";
import { monarchLatex } from "@/lib/data/monarch-latex";
import { useReduxSelector } from "@/lib/redux/hooks";
import {
	useReadWebFsFileQuery,
	useWriteWebFsFileMutation,
} from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import { extToLanguage } from "@/lib/utils/ext-to-language";

let customLanguagesRegistered = false;

function registerCustomLanguages(monaco: Monaco) {
	if (customLanguagesRegistered) return;
	customLanguagesRegistered = true;

	// LaTeX
	monaco.languages.register({
		id: "latex",
		extensions: [".tex", ".latex", ".ltx", ".sty", ".cls", ".bib"],
		aliases: ["LaTeX", "latex", "TeX"],
	});
	monaco.languages.setMonarchTokensProvider("latex", monarchLatex);
	monaco.languages.setLanguageConfiguration("latex", {
		comments: { lineComment: "%" },
		brackets: [
			["{", "}"],
			["[", "]"],
			["(", ")"],
		],
		autoClosingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: "$", close: "$" },
		],
		surroundingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: "$", close: "$" },
		],
	});

	// HTTP / REST
	monaco.languages.register({
		id: "http",
		extensions: [".http", ".rest"],
		aliases: ["HTTP", "REST"],
	});
	monaco.languages.setMonarchTokensProvider("http", monarchHttp);
	monaco.languages.setLanguageConfiguration("http", {
		comments: { lineComment: "#" },
		brackets: [
			["{", "}"],
			["[", "]"],
		],
	});

	// GraphQL
	monaco.languages.register({
		id: "graphql",
		extensions: [".graphql", ".gql"],
		aliases: ["GraphQL", "gql"],
	});
	monaco.languages.setMonarchTokensProvider("graphql", monarchGraphQL);
	monaco.languages.setLanguageConfiguration("graphql", {
		comments: { lineComment: "#" },
		brackets: [
			["{", "}"],
			["[", "]"],
			["(", ")"],
		],
		autoClosingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: '"', close: '"' },
		],
		surroundingPairs: [
			{ open: "{", close: "}" },
			{ open: "[", close: "]" },
			{ open: "(", close: ")" },
			{ open: '"', close: '"' },
		],
	});
}

export default function ScreenCode(
	props: Pick<
		EditorProps,
		| "defaultValue"
		| "defaultLanguage"
		| "defaultPath"
		| "value"
		| "language"
		| "path"
		| "saveViewState"
	>,
) {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);

	const fileWithProto = Boolean(activeFile?.path?.includes(":"));

	const {
		currentData: webFsFile,
		error: webFsFileError,
		isUninitialized: isUninitializedWebFsFile,
		isLoading: isLoadingWebFsFile,
		isError: isErrorWebFsFile,
	} = useReadWebFsFileQuery(
		{
			path: activeFile?.path || "",
		},
		{ skip: fileWithProto },
	);
	const [writeWebFsFileMutation] = useWriteWebFsFileMutation();
	const writeWebFsFileMutationThrottled = useThrottledCallback(
		async (content: string) => {
			if (!activeFile?.path) {
				return;
			}
			try {
				await writeWebFsFileMutation({
					path: activeFile.path,
					content,
				}).unwrap();
			} catch {
				/* mutation errors handled by RTK */
			}
		},
		2000,
	);

	const computedColorScheme = useComputedColorScheme("light", {
		getInitialValueInEffect: true,
	});

	const processing =
		(!fileWithProto && isUninitializedWebFsFile) || isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	if (processing) {
		return (
			<div>
				<p>Processing...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<p>Error: {error}</p>
			</div>
		);
	}

	return (
		<Editor
			beforeMount={registerCustomLanguages}
			theme={computedColorScheme === "light" ? "light" : "vs-dark"}
			language={activeFile?.language || extToLanguage(activeFile?.path || "")}
			path={activeFile?.path}
			defaultValue={webFsFile?.content || ""}
			onChange={(content) => writeWebFsFileMutationThrottled(content || "")}
			{...props}
		/>
	);
}
