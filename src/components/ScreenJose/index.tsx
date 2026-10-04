import { Center, Loader, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerJose from "@/lib/ui/ViewerJose";

function extensionOf(path: string): string {
	return path.split(".").pop()?.toLowerCase() ?? "";
}

export default function ScreenJose() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const filePath = activeFile?.path ?? "";
	const extension = useMemo(() => extensionOf(filePath), [filePath]);
	const fileWithProto = Boolean(filePath.includes(":"));
	const isUntitled = filePath.startsWith("untitled:");

	const {
		currentData: webFsFile,
		error: webFsFileError,
		isUninitialized,
		isLoading,
		isError,
	} = useReadWebFsFileQuery(
		{ path: filePath },
		{ skip: fileWithProto || isUntitled },
	);

	const processing =
		(!(fileWithProto || isUntitled) && isUninitialized) || isLoading;
	const error = isError
		? String((webFsFileError as Error)?.message)
		: undefined;

	if (processing) {
		return (
			<Center py="xl" px="sm" h="100%" role="status" aria-label="Loading…">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error && !isUntitled) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Stack align="center" gap="sm">
					<Text c="red" role="alert">
						Error: {error}
					</Text>
				</Stack>
			</Center>
		);
	}

	if (!webFsFile?.content) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No token or key to display</Text>
			</Center>
		);
	}

	return (
		<ViewerJose
			key={activeFile?.path}
			source={webFsFile.content}
			extension={extension}
		/>
	);
}
