import { Center, Loader } from "@mantine/core";
import { useThrottledCallback } from "@mantine/hooks";
import { useCallback, useMemo } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import {
	useReadWebFsFileQuery,
	useWriteWebFsFileMutation,
} from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import EditorCalendar from "@/lib/ui/EditorCalendar";
import {
	createEmptyCalendar,
	parseIcs,
	serializeIcs,
	type CalendarData,
} from "@/lib/utils/ics-parser";

const EMPTY_CALENDAR_ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//dysumi//Calendar//EN
END:VCALENDAR`;

export default function ScreenCalendar() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);

	const fileWithProto = Boolean(activeFile?.path?.includes(":"));
	const isUntitledCalendar = activeFile?.path?.startsWith("untitled:");

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
		{ skip: fileWithProto },
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
			} catch (error) {
				console.error(error);
			}
		},
		2000,
	);

	const processing =
		(!fileWithProto && !isUntitledCalendar && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	// Parse the ICS content
	const calendarData = useMemo((): CalendarData => {
		if (isUntitledCalendar) {
			return createEmptyCalendar();
		}
		const content = webFsFile?.content || EMPTY_CALENDAR_ICS;
		try {
			return parseIcs(content);
		} catch (e) {
			console.error("Failed to parse ICS:", e);
			return createEmptyCalendar();
		}
	}, [webFsFile?.content, isUntitledCalendar]);

	const handleChange = useCallback(
		(data: CalendarData) => {
			const icsContent = serializeIcs(data);
			writeWebFsFileMutationThrottled(icsContent);
		},
		[writeWebFsFileMutationThrottled],
	);

	if (processing) {
		return (
			<Center py="xl" px="sm">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error && !isUntitledCalendar) {
		return (
			<Center py="xl" px="sm">
				<p>Error: {error}</p>
			</Center>
		);
	}

	return (
		<EditorCalendar
			key={activeFile?.path}
			defaultValue={calendarData}
			onChange={handleChange}
		/>
	);
}
