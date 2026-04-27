import PDFViewer from "@embedpdf/react-pdf-viewer";
import {
	Center,
	Loader,
	Stack,
	Text,
	useComputedColorScheme,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileBinaryQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";

export default function ScreenPdf() {
	const computedColorScheme = useComputedColorScheme("light", {
		getInitialValueInEffect: true,
	});

	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);

	const fileWithProto = Boolean(activeFile?.path?.includes(":"));
	const isUntitledMedia = activeFile?.path?.startsWith("untitled:");

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
		{ skip: fileWithProto || isUntitledMedia },
	);

	const processing =
		(!(fileWithProto || isUntitledMedia) && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	// Create blob URL from binary data
	const webFsFileContent = webFsFile?.content;
	useEffect(() => {
		let localUrl: string | undefined;
		if (webFsFileContent && webFsFileContent.length > 0) {
			const blob = new Blob([webFsFileContent as BlobPart], {
				type: "application/pdf",
			});
			localUrl = URL.createObjectURL(blob);
			setPdfUrl(localUrl);
		}

		return () => {
			if (localUrl) {
				URL.revokeObjectURL(localUrl);
			}
		};
	}, [webFsFileContent]);

	if (processing) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error && !isUntitledMedia) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Stack align="center" gap="sm">
					<Text c="red">Error: {error}</Text>
				</Stack>
			</Center>
		);
	}

	if (!pdfUrl) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No PDF to display</Text>
			</Center>
		);
	}

	return (
		<PDFViewer
			key={[pdfUrl, computedColorScheme].join("-")}
			config={{
				src: pdfUrl,
				theme: { preference: computedColorScheme },
				disabledCategories: [
					"document-open",
					"document-close",
					"document-capture",
					"document-export",
					"document-protect",
					"panel-search",
					"panel-comment",
					"page",
					"annotation",
					"annotation-shape",
					"insert",
					"form",
					"redaction",
				],
			}}
			style={{ height: "100%" }}
		/>
	);
}
