import { Center, Loader, Stack, Text } from "@mantine/core";
import { useThrottledCallback } from "@mantine/hooks";
import { useReduxSelector } from "@/lib/redux/hooks";
import {
	useReadWebFsFileQuery,
	useWriteWebFsFileMutation,
} from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import EditorSV from "@/lib/ui/EditorSV";

function detectDelimiter(path?: string): string | undefined {
	const ext = path?.split(".").pop()?.toLowerCase();
	switch (ext) {
		case "tsv":
			return "\t";
		case "psv":
			return "|";
		case "csv":
			return ",";
		default:
			return undefined;
	}
}

export default function ScreenSV() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);

	const fileWithProto = Boolean(activeFile?.path?.includes(":"));
	const isUntitled = activeFile?.path?.startsWith("untitled:");

	const {
		currentData: webFsFile,
		error: webFsFileError,
		isUninitialized: isUninitializedWebFsFile,
		isLoading: isLoadingWebFsFile,
		isError: isErrorWebFsFile,
	} = useReadWebFsFileQuery(
		{ path: activeFile?.path || "" },
		{ skip: fileWithProto || isUntitled },
	);

	const [writeWebFsFileMutation] = useWriteWebFsFileMutation();
	const writeThrottled = useThrottledCallback(async (content: string) => {
		if (!activeFile?.path) return;
		try {
			await writeWebFsFileMutation({
				path: activeFile.path,
				content,
			}).unwrap();
		} catch {
			/* mutation errors handled by RTK */
		}
	}, 2000);

	const processing =
		(!(fileWithProto || isUntitled) && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	if (processing) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error && !isUntitled) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Stack align="center" gap="sm">
					<Text c="red">Error: {error}</Text>
				</Stack>
			</Center>
		);
	}

	const source = webFsFile?.content || "";
	const delimiter = detectDelimiter(activeFile?.path);

	return (
		<EditorSV
			key={activeFile?.path}
			delimiter={delimiter}
			defaultValue={source}
			onChange={writeThrottled}
		/>
	);
}
