import { Center, Loader, Stack, Text } from "@mantine/core";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerDiagram from "@/lib/ui/ViewerDiagram";

export default function ScreenDiagram() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const filePath = activeFile?.path ?? "";
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

	if (!webFsFile?.content?.trim()) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No diagram to display</Text>
			</Center>
		);
	}

	return <ViewerDiagram key={activeFile?.path} source={webFsFile.content} />;
}
