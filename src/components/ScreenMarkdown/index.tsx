import { useThrottledCallback } from "@mantine/hooks";
import { useCallback, useRef } from "react";
import {
	askSaveAs,
	saveDetail,
	useFileSaveKeys,
} from "@/components/EditorApp/shortcuts";
import { untitledMarkdown } from "@/lib/data/untitled-markdown";
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
import EditorMarkdown from "@/lib/ui/EditorMarkdown";

export default function ScreenMarkdown() {
	const dispatch = useReduxDispatch();
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const workspace = useReduxSelector(selectorInterfaceGetWorkspacePath);

	const fileWithProto = Boolean(activeFile?.path?.includes(":"));

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
	if (latest.current === null && fileWithProto) {
		latest.current = untitled.text ?? untitledMarkdown;
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
	const writeWebFsFileMutationThrottled = useThrottledCallback(
		(content: string) => {
			if (!path || path.includes(":")) return;
			writeNow(path, content).catch(() => undefined);
		},
		2000,
	);
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
	const handleChange = useCallback(
		(content?: string) => {
			latest.current = content ?? "";
			untitled.save(latest.current);
			writeWebFsFileMutationThrottled(latest.current);
		},
		[untitled.save, writeWebFsFileMutationThrottled],
	);

	const processing =
		(!fileWithProto && isUninitializedWebFsFile) || isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	if (processing) {
		return (
			<div>
				<p>Processing...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<p>Error: {error}</p>
			</div>
		);
	}

	return (
		<EditorMarkdown
			defaultValue={latest.current ?? untitledMarkdown}
			onChange={handleChange}
		/>
	);
}
