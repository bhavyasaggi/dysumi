import { Center, Loader, Stack, Text } from "@mantine/core";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerGraphQL from "@/lib/ui/ViewerGraphQL";

export default function ScreenGraphQL() {
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
	if (!source) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No GraphQL content to display</Text>
			</Center>
		);
	}

	return <ViewerGraphQL key={activeFile?.path} source={source} />;
}
