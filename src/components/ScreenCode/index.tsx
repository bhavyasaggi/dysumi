import { useComputedColorScheme } from "@mantine/core";
import { useThrottledCallback } from "@mantine/hooks";
import Editor, { type EditorProps, type Monaco } from "@monaco-editor/react";
import { useCallback, useRef } from "react";
import {
	askSaveAs,
	saveDetail,
	useFileSaveKeys,
} from "@/components/EditorApp/shortcuts";
import { monarchGraphQL } from "@/lib/data/monarch-graphql";
import { monarchHledgerRules } from "@/lib/data/monarch-hledger-rules";
import { monarchHttp } from "@/lib/data/monarch-http";
import { monarchLatex } from "@/lib/data/monarch-latex";
import { monarchLedger } from "@/lib/data/monarch-ledger";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import { useUntitledDraft } from "@/lib/redux/queries/drafts";
import {
	useReadWebFsFileQuery,
	useWriteWebFsFileMutation,
} from "@/lib/redux/queries/web-fs/read-write";
import {
	actionInterfaceOpenFile,
	actionInterfacePushNotification,
	selectorInterfaceGetActiveFile,
	selectorInterfaceGetWorkspacePath,
} from "@/lib/redux/slices/interface";
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

	// Ledger, hledger, and journal files share one journal grammar.
	monaco.languages.register({
		id: "ledger",
		extensions: [".ledger", ".journal", ".hledger", ".ldg"],
		aliases: ["Ledger", "hledger", "journal"],
	});
	monaco.languages.setMonarchTokensProvider("ledger", monarchLedger);
	monaco.languages.setLanguageConfiguration("ledger", {
		comments: { lineComment: ";" },
		brackets: [
			["(", ")"],
			["[", "]"],
		],
		autoClosingPairs: [
			{ open: "(", close: ")" },
			{ open: "[", close: "]" },
		],
		folding: {
			markers: {
				start: /^\d{4}[/-]\d{2}[/-]\d{2}.*/,
				end: /^\s*$/,
			},
		},
	});

	// hledger CSV rules.
	monaco.languages.register({
		id: "hledger-rules",
		extensions: [".rules"],
		aliases: ["hledger rules"],
	});
	monaco.languages.setMonarchTokensProvider(
		"hledger-rules",
		monarchHledgerRules,
	);
	monaco.languages.setLanguageConfiguration("hledger-rules", {
		comments: { lineComment: ";" },
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
	const dispatch = useReduxDispatch();
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const workspace = useReduxSelector(selectorInterfaceGetWorkspacePath);

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
	const latest = useRef<string | null>(null);
	const loadedFor = useRef<string | null>(null);
	const path = activeFile?.path;
	const untitled = useUntitledDraft(path);
	if (loadedFor.current !== (path ?? null)) {
		loadedFor.current = path ?? null;
		latest.current = null;
	}
	if (latest.current === null && webFsFile?.content != null) {
		latest.current = webFsFile.content;
	}
	if (latest.current === null && fileWithProto) {
		latest.current = untitled.text ?? "";
	}
	const [writeWebFsFileMutation] = useWriteWebFsFileMutation();
	const writeNow = useCallback(
		async (target: string, content: string) => {
			const name = target.split("/").pop() || target;
			try {
				await writeWebFsFileMutation({ path: target, content }).unwrap();
				dispatch(
					actionInterfacePushNotification({
						key: `save:${target}`,
						tone: "success",
						title: `Saved ${name}`,
					}),
				);
			} catch (error) {
				dispatch(
					actionInterfacePushNotification({
						key: `save:${target}`,
						tone: "error",
						title: `Could not save ${name}`,
						detail: saveDetail(error),
					}),
				);
			}
		},
		[dispatch, writeWebFsFileMutation],
	);
	const writeWebFsFileMutationThrottled = useThrottledCallback(
		(content: string) => {
			if (!path || path.includes(":")) return;
			writeNow(path, content).catch(() => undefined);
		},
		2000,
	);
	const save = useCallback(async () => {
		if (latest.current == null || !path) return;
		if (path.includes(":")) {
			const chosen = askSaveAs(dispatch, { currentPath: path, workspace });
			if (!chosen) return;
			await writeNow(chosen.path, latest.current);
			dispatch(
				actionInterfaceOpenFile({ name: chosen.name, path: chosen.path }),
			);
			return;
		}
		await writeNow(path, latest.current);
	}, [dispatch, path, workspace, writeNow]);
	const saveAs = useCallback(async () => {
		if (latest.current == null || !path) return;
		const chosen = askSaveAs(dispatch, { currentPath: path, workspace });
		if (!chosen) return;
		await writeNow(chosen.path, latest.current);
		dispatch(actionInterfaceOpenFile({ name: chosen.name, path: chosen.path }));
	}, [dispatch, path, workspace, writeNow]);
	useFileSaveKeys({ save, saveAs });

	const computedColorScheme = useComputedColorScheme("light", {
		getInitialValueInEffect: true,
	});
	const handleContentChange = useCallback(
		(content: string | undefined) => {
			latest.current = content ?? "";
			untitled.save(latest.current);
			writeWebFsFileMutationThrottled(latest.current);
		},
		[untitled.save, writeWebFsFileMutationThrottled],
	);

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
			defaultValue={latest.current ?? ""}
			onChange={handleContentChange}
			{...props}
		/>
	);
}
