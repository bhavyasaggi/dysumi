import { Center, Loader, Stack, Text } from "@mantine/core";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileBinaryQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerTorrent from "@/lib/ui/ViewerTorrent";

export default function ScreenTorrent() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const filePath = activeFile?.path ?? "";
	const fileName = filePath.split("/").pop() || "download.torrent";
	const fileWithProto = Boolean(filePath.includes(":"));
	const isUntitled = filePath.startsWith("untitled:");

	const {
		currentData: webFsFile,
		error: webFsFileError,
		isUninitialized,
		isLoading,
		isError,
	} = useReadWebFsFileBinaryQuery(
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

	if (!webFsFile?.content || webFsFile.content.length === 0) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No torrent to display</Text>
			</Center>
		);
	}

	return (
		<ViewerTorrent
			key={activeFile?.path}
			source={webFsFile.content}
			fileName={webFsFile.name || fileName}
		/>
	);
}
