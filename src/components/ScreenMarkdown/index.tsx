import { useThrottledCallback } from "@mantine/hooks";
import { untitledMarkdown } from "@/lib/data/untitled-markdown";
import { useReduxSelector } from "@/lib/redux/hooks";
import {
	useReadWebFsFileQuery,
	useWriteWebFsFileMutation,
} from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import EditorMarkdown from "@/lib/ui/EditorMarkdown";

export default function ScreenMarkdown() {
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
			} catch (error) {
				console.error(error);
			}
		},
		2000,
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
		<EditorMarkdown
			defaultValue={webFsFile?.content || untitledMarkdown}
			onChange={(content) => {
				writeWebFsFileMutationThrottled(content || "");
			}}
		/>
	);
}
