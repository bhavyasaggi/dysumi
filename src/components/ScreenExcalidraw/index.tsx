import { Center, Loader, Stack, Text } from "@mantine/core";
import { useThrottledCallback } from "@mantine/hooks";
import { useCallback, useRef, useState } from "react";
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
import EditorExcalidraw from "@/lib/ui/EditorExcalidraw";

export default function ScreenExcalidraw() {
	const dispatch = useReduxDispatch();
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const workspace = useReduxSelector(selectorInterfaceGetWorkspacePath);
	const filePath = activeFile?.path ?? "";
	const untitled = useUntitledDraft(filePath);
	const fileWithProto = Boolean(filePath.includes(":"));

	const {
		currentData: webFsFile,
		error: webFsFileError,
		isUninitialized,
		isLoading,
		isError,
	} = useReadWebFsFileQuery({ path: filePath }, { skip: fileWithProto });
	const latest = useRef<string | null>(null);
	const loadedFor = useRef<string | null>(null);
	if (loadedFor.current !== filePath) {
		loadedFor.current = filePath;
		latest.current = null;
	}
	if (latest.current === null && webFsFile?.content != null) {
		latest.current = webFsFile.content;
	}
	if (latest.current === null && fileWithProto) {
		latest.current = untitled.text ?? "";
	}
	const [writeFile] = useWriteWebFsFileMutation();
	const writeNow = useCallback(
		async (target: string, content: string) => {
			const name = target.split("/").pop() || target;
			try {
				await writeFile({ path: target, content }).unwrap();
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
		[dispatch, writeFile],
	);
	const persist = useThrottledCallback((content: string) => {
		if (!filePath || filePath.includes(":")) return;
		writeNow(filePath, content).catch(() => undefined);
	}, 2000);
	const save = useCallback(async () => {
		if (latest.current == null || !filePath) return;
		if (filePath.includes(":")) {
			const chosen = askSaveAs(dispatch, {
				currentPath: filePath,
				workspace,
			});
			if (!chosen) return;
			await writeNow(chosen.path, latest.current);
			dispatch(
				actionInterfaceOpenFile({ name: chosen.name, path: chosen.path }),
			);
			return;
		}
		await writeNow(filePath, latest.current);
	}, [dispatch, filePath, workspace, writeNow]);
	const saveAs = useCallback(async () => {
		if (latest.current == null || !filePath) return;
		const chosen = askSaveAs(dispatch, { currentPath: filePath, workspace });
		if (!chosen) return;
		await writeNow(chosen.path, latest.current);
		dispatch(actionInterfaceOpenFile({ name: chosen.name, path: chosen.path }));
	}, [dispatch, filePath, workspace, writeNow]);
	useFileSaveKeys({ save, saveAs });
	const handleChange = useCallback(
		(content: string) => {
			latest.current = content;
			untitled.save(content);
			persist(content);
		},
		[untitled.save, persist],
	);

	const [snapshot, setSnapshot] = useState<{
		path: string;
		content: string;
	} | null>(null);
	if (!fileWithProto && webFsFile && snapshot?.path !== filePath) {
		setSnapshot({ path: filePath, content: webFsFile.content ?? "" });
	}
	if (fileWithProto && snapshot?.path !== filePath) {
		setSnapshot({ path: filePath, content: untitled.text ?? "" });
	}

	const processing = (!fileWithProto && isUninitialized) || isLoading;
	const error = isError
		? String((webFsFileError as Error)?.message)
		: undefined;

	if (processing || snapshot?.path !== filePath) {
		return (
			<Center py="xl" px="sm" h="100%" role="status" aria-label="Loading…">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error) {
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

	return (
		<EditorExcalidraw
			key={filePath}
			defaultValue={snapshot.content}
			onChange={handleChange}
		/>
	);
}
