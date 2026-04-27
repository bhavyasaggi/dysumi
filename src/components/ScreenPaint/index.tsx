// Easter Egg: BMP files get the classic MS Paint treatment!

import { Center, Loader, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileBinaryQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerPaint from "@/lib/ui/ViewerPaint";

/** Convert Uint8Array to a base64 data URL (works cross-origin unlike blob:). */
function toDataUrl(data: Uint8Array, mimeType: string): string {
	let binary = "";
	const chunkSize = 8192;
	for (let i = 0; i < data.length; i += chunkSize) {
		const chunk = data.subarray(i, Math.min(i + chunkSize, data.length));
		binary += String.fromCharCode(...chunk);
	}
	return `data:${mimeType};base64,${btoa(binary)}`;
}

export default function ScreenPaint() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);

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

	// Get file name from path
	const fileName = useMemo(() => {
		const path = activeFile?.path || "";
		return path.split("/").pop() || "untitled.bmp";
	}, [activeFile?.path]);

	// Derive data URL from binary content (data: URLs work cross-origin, blob: URLs do not)
	const imageUrl = useMemo(() => {
		if (!webFsFile?.content || webFsFile.content.length === 0) return null;
		return toDataUrl(webFsFile.content, "image/bmp");
	}, [webFsFile?.content]);

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

	return (
		<ViewerPaint
			key={activeFile?.path}
			src={imageUrl || undefined}
			fileName={fileName}
		/>
	);
}
