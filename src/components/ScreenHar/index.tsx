import { Center, Loader, Stack, Text } from "@mantine/core";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useParseHarQuery } from "@/lib/redux/queries/parse";
import { useReadWebFsFileQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerHar from "@/lib/ui/ViewerHar";

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

	const content = webFsFile?.content;
	const parsed = useParseHarQuery({ text: content ?? "" }, { skip: !content });
	const parsing = Boolean(content) && !parsed.data && !parsed.isError;

	const processing =
		(!(fileWithProto || isUntitled) && isUninitialized) || isLoading || parsing;

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

	if (parsed.isError || !parsed.data) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No HAR data to display</Text>
			</Center>
		);
	}

	return (
		<ViewerHar
			key={activeFile?.path}
			entries={parsed.data.entries}
			summary={parsed.data.summary}
		/>
	);
}
