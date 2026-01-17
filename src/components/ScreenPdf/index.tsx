import { Center, Loader, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileBinaryQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import EditorPdf from "@/lib/ui/EditorPdf";

export default function ScreenPdf() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);

	const fileWithProto = Boolean(activeFile?.path?.includes(":"));
	const isUntitledPdf = activeFile?.path?.startsWith("untitled:");

	const {
		currentData: webFsFile,
		error: webFsFileError,
		isUninitialized: isUninitializedWebFsFile,
		isLoading: isLoadingWebFsFile,
		isError: isErrorWebFsFile,
	} = useReadWebFsFileBinaryQuery(
		{
			path: activeFile?.path || "",
		},
		{ skip: fileWithProto || isUntitledPdf },
	);

	const processing =
		(!fileWithProto && !isUntitledPdf && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	// Get file name from path
	const fileName = useMemo(() => {
		const path = activeFile?.path || "";
		return path.split("/").pop() || "document.pdf";
	}, [activeFile?.path]);

	// Get PDF data as Uint8Array
	// Create a deep copy to avoid ArrayBuffer detachment issues when pdf.js transfers to worker
	const pdfData = useMemo(() => {
		if (webFsFile?.content && webFsFile.content.length > 0) {
			// Create a completely independent copy using slice()
			// This ensures the underlying ArrayBuffer is not shared
			return webFsFile.content.slice();
		}
		return undefined;
	}, [webFsFile?.content]);

	if (processing) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error && !isUntitledPdf) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Stack align="center" gap="sm">
					<Text c="red">Error: {error}</Text>
				</Stack>
			</Center>
		);
	}

	if (!pdfData) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No PDF to display</Text>
			</Center>
		);
	}

	return (
		<EditorPdf
			key={activeFile?.path}
			src={pdfData}
			fileName={fileName}
		/>
	);
}