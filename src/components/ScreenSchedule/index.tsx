import { Center, Loader, Stack, Text } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { useCallback, useRef } from "react";
import {
	askSaveAs,
	saveDetail,
	useFileSaveKeys,
} from "@/components/EditorApp/shortcuts";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import { useUntitledDraft } from "@/lib/redux/queries/drafts";
import { useParseIcsQuery } from "@/lib/redux/queries/parse";
import {
	useReadWebFsFileQuery,
	useWriteWebFsFileMutation,
} from "@/lib/redux/queries/web-fs/read-write";
import {
	actionInterfaceOpenFile,
	actionInterfacePushNotification,
	selectorInterfaceGetActiveFile,
	selectorInterfaceGetWorkspacePath,
} from "@/lib/redux/slices/interface";
import EditorSchedule from "@/lib/ui/EditorSchedule";
import { type CalendarData, serializeIcs } from "@/lib/utils/ics";

export default function ScreenSchedule() {
	const dispatch = useReduxDispatch();
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const workspace = useReduxSelector(selectorInterfaceGetWorkspacePath);

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
	const latest = useRef<string | null>(null);
	const loadedFor = useRef<string | null>(null);
	const path = activeFile?.path;
	const untitled = useUntitledDraft(path);
	if (loadedFor.current !== (path ?? null)) {
		loadedFor.current = path ?? null;
		latest.current = null;
	}
	if (latest.current === null && webFsFile?.content != null) {
		latest.current = webFsFile.content;
	}
	if (latest.current === null && path?.includes(":")) {
		latest.current = untitled.text ?? "";
	}
	const [writeWebFsFileMutation] = useWriteWebFsFileMutation();
	const writeNow = useCallback(
		async (target: string, content: string) => {
			const name = target.split("/").pop() || target;
			try {
				await writeWebFsFileMutation({ path: target, content }).unwrap();
				dispatch(
					actionInterfacePushNotification({
						key: `save:${target}`,
						tone: "success",
						title: `Saved ${name}`,
					}),
				);
			} catch (error) {
				dispatch(
					actionInterfacePushNotification({
						key: `save:${target}`,
						tone: "error",
						title: `Could not save ${name}`,
						detail: saveDetail(error),
					}),
				);
			}
		},
		[dispatch, writeWebFsFileMutation],
	);
	// Wait for edits to settle, but still write during a long drag, and flush
	// the pending text if the screen unmounts before the delay ends.
	const persistSchedule = useDebouncedCallback(
		(content: string) => {
			if (!path || path.includes(":")) return;
			writeNow(path, content).catch(() => undefined);
		},
		{ delay: 500, maxWait: 2000, flushOnUnmount: true },
	);
	const save = useCallback(async () => {
		persistSchedule.cancel();
		if (latest.current == null || !path) return;
		if (path.includes(":")) {
			const chosen = askSaveAs(dispatch, { currentPath: path, workspace });
			if (!chosen) return;
			await writeNow(chosen.path, latest.current);
			dispatch(
				actionInterfaceOpenFile({ name: chosen.name, path: chosen.path }),
			);
			return;
		}
		await writeNow(path, latest.current);
	}, [dispatch, path, persistSchedule, workspace, writeNow]);
	const saveAs = useCallback(async () => {
		persistSchedule.cancel();
		if (latest.current == null || !path) return;
		const chosen = askSaveAs(dispatch, { currentPath: path, workspace });
		if (!chosen) return;
		await writeNow(chosen.path, latest.current);
		dispatch(actionInterfaceOpenFile({ name: chosen.name, path: chosen.path }));
	}, [dispatch, path, persistSchedule, workspace, writeNow]);
	useFileSaveKeys({ save, saveAs });
	const handleScheduleChange = useCallback(
		(content: CalendarData) => {
			const text = serializeIcs(content);
			latest.current = text;
			untitled.save(text);
			persistSchedule(text);
		},
		[untitled.save, persistSchedule],
	);

	const content = latest.current ?? webFsFile?.content;
	const parsed = useParseIcsQuery({ text: content ?? "" }, { skip: !content });
	const parsing = Boolean(content) && !parsed.data && !parsed.isError;

	const processing =
		(!(fileWithProto || isUntitled) && isUninitializedWebFsFile) ||
		isLoadingWebFsFile ||
		parsing;
	const error = isErrorWebFsFile
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
				<Text c="dimmed">No schedule data to display</Text>
			</Center>
		);
	}

	return (
		<EditorSchedule
			key={activeFile?.path}
			defaultValue={parsed.data}
			onChange={handleScheduleChange}
		/>
	);
}
