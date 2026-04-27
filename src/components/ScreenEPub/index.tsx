import { Center, Loader, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileBinaryQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerEPub from "@/lib/ui/ViewerEPub";

export default function ScreenEPub() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const [epubUrl, setEpubUrl] = useState<string | null>(null);

	const fileWithProto = Boolean(activeFile?.path?.includes(":"));
	const isUntitled = activeFile?.path?.startsWith("untitled:");

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
		{ skip: fileWithProto || isUntitled },
	);

	const processing =
		(!(fileWithProto || isUntitled) && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	// Create blob URL from binary data — revoke previous URL on change or unmount
	const webFsFileContent = webFsFile?.content;
	useEffect(() => {
		let localUrl: string | undefined;
		if (webFsFileContent && webFsFileContent.length > 0) {
			const blob = new Blob([webFsFileContent as BlobPart], {
				type: "application/epub+zip",
			});
			localUrl = URL.createObjectURL(blob);
			setEpubUrl(localUrl);
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

	if (error && !isUntitled) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Stack align="center" gap="sm">
					<Text c="red">Error: {error}</Text>
				</Stack>
			</Center>
		);
	}

	if (!epubUrl) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No EPUB to display</Text>
			</Center>
		);
	}

	return <ViewerEPub key={activeFile?.path} src={epubUrl} />;
}
