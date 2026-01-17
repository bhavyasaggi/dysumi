import { useComputedColorScheme } from "@mantine/core";
import { useThrottledCallback } from "@mantine/hooks";
import Editor, { type EditorProps } from "@monaco-editor/react";
import { useReduxSelector } from "@/lib/redux/hooks";
import {
	useReadWebFsFileQuery,
	useWriteWebFsFileMutation,
} from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import { extToLanguage } from "@/lib/utils/ext-to-language";

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
	const writeWebFsFileMutationThrolled = useThrottledCallback(
		async (content: string) => {
			if (!activeFile?.path) {
				return;
			}
			try {
				await writeWebFsFileMutation({
					path: activeFile.path,
					content,
				}).unwrap();
			} catch (error) {
				console.error(error);
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
			theme={computedColorScheme === "light" ? "light" : "vs-dark"}
			language={activeFile?.language || extToLanguage(activeFile?.path || "")}
			path={activeFile?.path}
			defaultValue={webFsFile?.content || ""}
			onChange={(content) => writeWebFsFileMutationThrolled(content || "")}
			{...props}
		/>
	);
}
