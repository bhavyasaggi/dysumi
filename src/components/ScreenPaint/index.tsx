// Easter Egg: BMP files get the classic MS Paint + Clippy treatment!

import { Center, Loader, Stack, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileBinaryQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerPaint from "@/lib/ui/ViewerPaint";

export default function ScreenPaint() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const [imageUrl, setImageUrl] = useState<string | null>(null);

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
		(!fileWithProto && !isUntitled && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	// Get file name from path
	const fileName = useMemo(() => {
		const path = activeFile?.path || "";
		return path.split("/").pop() || "untitled.bmp";
	}, [activeFile?.path]);

	// Create blob URL from binary data
	useEffect(() => {
		if (webFsFile?.content && webFsFile.content.length > 0) {
			const blob = new Blob([webFsFile.content], { type: "image/bmp" });
			const url = URL.createObjectURL(blob);
			setImageUrl(url);

			return () => {
				URL.revokeObjectURL(url);
			};
		}
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