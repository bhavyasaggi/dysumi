import { Center, Loader, Stack, Text } from "@mantine/core";
import { useThrottledCallback } from "@mantine/hooks";
import { useMemo } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import {
	useReadWebFsFileQuery,
	useWriteWebFsFileMutation,
} from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import EditorSchedule from "@/lib/ui/EditorSchedule";
import { parseIcs, serializeIcs } from "@/lib/utils/ics";

export default function ScreenSchedule() {
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
		{
			path: activeFile?.path || "",
		},
		{ skip: fileWithProto || isUntitled },
	);
	const [writeWebFsFileMutation] = useWriteWebFsFileMutation();
	const writeWebFsFileMutationThrottled = useThrottledCallback(
		async (content: string) => {
			if (!activeFile?.path) {
				return;
			}
			try {
				await writeWebFsFileMutation({
					path: activeFile.path,
					content,
				}).unwrap();
			} catch {
				/* mutation errors handled by RTK */
			}
		},
		2000,
	);

	const processing =
		(!(fileWithProto || isUntitled) && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	// Parse ICS content into CalendarData
	const calendarData = useMemo(() => {
		if (!webFsFile?.content) return null;

		try {
			return parseIcs(webFsFile.content);
		} catch {
			return null;
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

	if (!calendarData) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No schedule data to display</Text>
			</Center>
		);
	}

	return (
		<EditorSchedule
			key={activeFile?.path}
			defaultValue={calendarData}
			onChange={(content) => {
				writeWebFsFileMutationThrottled(content ? serializeIcs(content) : "");
			}}
		/>
	);
}
