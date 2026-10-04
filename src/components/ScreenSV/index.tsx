import { Center, Loader, Stack, Text } from "@mantine/core";
import { useThrottledCallback } from "@mantine/hooks";
import { useCallback, useRef } from "react";
import {
	askSaveAs,
	saveDetail,
	useFileSaveKeys,
} from "@/components/EditorApp/shortcuts";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import { useUntitledDraft } from "@/lib/redux/queries/drafts";
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
import EditorSV from "@/lib/ui/EditorSV";

function detectDelimiter(path?: string): string | undefined {
	const ext = path?.split(".").pop()?.toLowerCase();
	switch (ext) {
		case "tsv":
			return "\t";
		case "psv":
			return "|";
		case "csv":
			return ",";
		default:
			return undefined;
	}
}

export default function ScreenSV() {
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
		{ path: activeFile?.path || "" },
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
	const writeThrottled = useThrottledCallback((content: string) => {
		if (!path || path.includes(":")) return;
		writeNow(path, content).catch(() => undefined);
	}, 2000);
	const save = useCallback(async () => {
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
	}, [dispatch, path, workspace, writeNow]);
	const saveAs = useCallback(async () => {
		if (latest.current == null || !path) return;
		const chosen = askSaveAs(dispatch, { currentPath: path, workspace });
		if (!chosen) return;
		await writeNow(chosen.path, latest.current);
		dispatch(actionInterfaceOpenFile({ name: chosen.name, path: chosen.path }));
	}, [dispatch, path, workspace, writeNow]);
	useFileSaveKeys({ save, saveAs });
	const onChange = useCallback(
		(content: string) => {
			latest.current = content;
			untitled.save(content);
			writeThrottled(content);
		},
		[untitled.save, writeThrottled],
	);

	const processing =
		(!(fileWithProto || isUntitled) && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
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

	const source = latest.current ?? webFsFile?.content ?? "";
	const delimiter = detectDelimiter(activeFile?.path);

	return (
		<EditorSV
			key={activeFile?.path}
			delimiter={delimiter}
			defaultValue={source}
			onChange={onChange}
		/>
	);
}
