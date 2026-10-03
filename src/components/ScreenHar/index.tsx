import { Center, Loader, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerHar from "@/lib/ui/ViewerHar";
import { parseHar } from "@/lib/utils/har";

export default function ScreenHar() {
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

	const harData = useMemo(() => {
		if (!webFsFile?.content) return null;
		try {
			return parseHar(webFsFile.content);
		} catch {
			return null;
		}
	}, [webFsFile?.content]);

	const processing =
		(!(fileWithProto || isUntitled) && isUninitialized) || isLoading;

	const error = isError
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

	if (!harData) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No HAR data to display</Text>
			</Center>
		);
	}

	return (
		<ViewerHar
			key={activeFile?.path}
			entries={harData.entries}
			summary={harData.summary}
		/>
	);
}
