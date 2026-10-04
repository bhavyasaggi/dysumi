import { Center, Loader, Stack, Text } from "@mantine/core";
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
import EditorSvg from "@/lib/ui/EditorSvg";

export default function ScreenSvg() {
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
		refetch,
	} = useReadWebFsFileQuery({ path: filePath }, { skip: fileWithProto });
	const [writeFile] = useWriteWebFsFileMutation();
	const [generation, setGeneration] = useState(0);

	const [snapshot, setSnapshot] = useState<{
		path: string;
		content: string;
	} | null>(null);
	const latest = useRef<string | null>(null);
	const onOutput = useCallback(
		(svg: string) => {
			latest.current = svg;
			untitled.save(svg);
		},
		[untitled.save],
	);
	const writeCopy = useCallback(
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
	const save = useCallback(async () => {
		const content = latest.current ?? snapshot?.content;
		if (content == null || !filePath) return;
		if (filePath.includes(":")) {
			const chosen = askSaveAs(dispatch, { currentPath: filePath, workspace });
			if (!chosen) return;
			await writeCopy(chosen.path, content);
			dispatch(
				actionInterfaceOpenFile({ name: chosen.name, path: chosen.path }),
			);
			return;
		}
		await writeCopy(filePath, content);
	}, [dispatch, filePath, snapshot?.content, workspace, writeCopy]);
	const saveAs = useCallback(async () => {
		const content = latest.current ?? snapshot?.content;
		if (content == null || !filePath) return;
		const chosen = askSaveAs(dispatch, { currentPath: filePath, workspace });
		if (!chosen) return;
		await writeCopy(chosen.path, content);
		dispatch(actionInterfaceOpenFile({ name: chosen.name, path: chosen.path }));
	}, [dispatch, filePath, snapshot?.content, workspace, writeCopy]);
	useFileSaveKeys({ save, saveAs });
	const handleSave = useCallback(
		async (svg: string) => {
			await writeFile({ path: filePath, content: svg }).unwrap();
		},
		[filePath, writeFile],
	);
	const handleRefresh = useCallback(async () => {
		if (!fileWithProto) {
			const result = await refetch();
			if (result.data) {
				setSnapshot({
					path: filePath,
					content: result.data.content ?? "",
				});
			}
		}
		setGeneration((value) => value + 1);
	}, [filePath, fileWithProto, refetch]);
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

	if (!snapshot.content.trim()) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No SVG to optimize</Text>
			</Center>
		);
	}

	if (!/<svg[\s>]/i.test(snapshot.content)) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="red" role="alert">
					This file is not an SVG
				</Text>
			</Center>
		);
	}

	return (
		<EditorSvg
			key={`${filePath}:${generation}`}
			source={snapshot.content}
			onSave={handleSave}
			onRefresh={handleRefresh}
			onOutput={onOutput}
		/>
	);
}
