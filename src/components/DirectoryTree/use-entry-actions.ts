import { useCallback, useMemo } from "react";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import { pathsAfterDelete, pathsAfterRename } from "@/lib/redux/open-files";
import {
	useCopyWebFsEntryMutation,
	useCreateWebFsDirectoryMutation,
	useCreateWebFsFileMutation,
	useDeleteWebFsEntryMutation,
	useMoveWebFsEntryMutation,
	useRenameWebFsEntryMutation,
} from "@/lib/redux/queries/web-fs/modify";
import {
	actionInterfaceOpenFile,
	actionInterfacePushNotification,
	actionInterfaceSetDirectoryClipboard,
	actionInterfaceSetDirectorySelection,
	actionInterfaceUpdate,
	selectorInterfaceGetActiveFile,
	selectorInterfaceGetDirectoryClipboard,
	selectorInterfaceGetDirectorySelection,
	selectorInterfaceGetOpenFiles,
	selectorInterfaceGetWorkspacePath,
} from "@/lib/redux/slices/interface";
import {
	clipboardActionLabel,
	clipboardNotice,
	dropClipboardPath,
	nextClipboard,
	pasteLabel,
	pasteNotice,
	retargetClipboard,
} from "./clipboard";
import {
	acceptedName,
	askName,
	failureMessage,
	joinedPath,
	parentPath,
} from "./names";

export function useEntryActions(props: {
	name: string;
	fullPath: string;
	isDirectory?: boolean;
}) {
	const dispatch = useReduxDispatch();
	const openFiles = useReduxSelector(selectorInterfaceGetOpenFiles);
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const clip = useReduxSelector(selectorInterfaceGetDirectoryClipboard);
	const selection = useReduxSelector(selectorInterfaceGetDirectorySelection);
	const workspace = useReduxSelector(selectorInterfaceGetWorkspacePath);
	const currentEntry = useMemo(
		() => ({
			path: props.fullPath,
			name: props.name,
			isDirectory: Boolean(props.isDirectory),
		}),
		[props.fullPath, props.isDirectory, props.name],
	);
	const targets = useMemo(() => {
		if (
			selection.some((item) => item.path === props.fullPath) &&
			selection.length > 1
		) {
			return selection.filter((item) => item.path !== workspace);
		}
		return [currentEntry];
	}, [currentEntry, props.fullPath, selection, workspace]);
	const [createFile] = useCreateWebFsFileMutation();
	const [createDirectory] = useCreateWebFsDirectoryMutation();
	const [removeEntry] = useDeleteWebFsEntryMutation();
	const [copyEntry] = useCopyWebFsEntryMutation();
	const [moveEntry] = useMoveWebFsEntryMutation();
	const [renameEntry] = useRenameWebFsEntryMutation();

	const onNewFile = useCallback(async () => {
		const name = acceptedName(
			askName("New file name", "untitled.md"),
			dispatch,
		);
		if (!name) return;
		const path = joinedPath(props.fullPath, name);
		try {
			await createFile({ path, options: { force: true } }).unwrap();
			dispatch(actionInterfaceOpenFile({ name, path }));
			dispatch(
				actionInterfacePushNotification({
					tone: "success",
					title: `Created ${name}`,
				}),
			);
		} catch (error) {
			dispatch(
				actionInterfacePushNotification({
					tone: "error",
					title: `Could not create ${name}`,
					detail: failureMessage(error),
				}),
			);
		}
	}, [createFile, dispatch, props.fullPath]);

	const onNewFolder = useCallback(async () => {
		const name = acceptedName(askName("New folder name", "folder"), dispatch);
		if (!name) return;
		try {
			await createDirectory({
				path: joinedPath(props.fullPath, name),
				options: { force: true },
			}).unwrap();
			dispatch(
				actionInterfacePushNotification({
					tone: "success",
					title: `Created ${name}`,
				}),
			);
		} catch (error) {
			dispatch(
				actionInterfacePushNotification({
					tone: "error",
					title: `Could not create ${name}`,
					detail: failureMessage(error),
				}),
			);
		}
	}, [createDirectory, dispatch, props.fullPath]);

	const onRename = useCallback(async () => {
		const name = acceptedName(askName("New name", props.name), dispatch);
		if (!name || name === props.name) return;
		const renamed = joinedPath(parentPath(props.fullPath), name);
		try {
			await renameEntry({ path: props.fullPath, newName: name }).unwrap();
			dispatch(
				actionInterfaceUpdate(
					pathsAfterRename(openFiles, {
						path: props.fullPath,
						nextPath: renamed,
						active: activeFile?.path,
					}),
				),
			);
			const nextClip = retargetClipboard(clip, {
				from: props.fullPath,
				to: renamed,
			});
			if (nextClip !== clip) {
				dispatch(actionInterfaceSetDirectoryClipboard(nextClip));
			}
			dispatch(
				actionInterfacePushNotification({
					tone: "success",
					title: `Renamed ${props.name} to ${name}`,
				}),
			);
		} catch (error) {
			dispatch(
				actionInterfacePushNotification({
					tone: "error",
					title: `Could not rename ${props.name}`,
					detail: failureMessage(error),
				}),
			);
		}
	}, [
		activeFile?.path,
		clip,
		dispatch,
		openFiles,
		props.fullPath,
		props.name,
		renameEntry,
	]);

	const onDelete = useCallback(async () => {
		const label = targets.length > 1 ? `${targets.length} items` : props.name;
		const confirmed = window.confirm(`Delete ${label}? This cannot be undone.`);
		if (!confirmed) return;
		try {
			let files = openFiles;
			let active = activeFile?.path;
			let nextClip = clip;
			for (const entry of targets) {
				await removeEntry({ path: entry.path }).unwrap();
				const placed = pathsAfterDelete(files, {
					path: entry.path,
					active,
				});
				files = placed.openFiles;
				active = placed.activeFile;
				nextClip = dropClipboardPath(nextClip, entry.path);
			}
			dispatch(actionInterfaceUpdate({ openFiles: files, activeFile: active }));
			if (nextClip !== clip) {
				dispatch(actionInterfaceSetDirectoryClipboard(nextClip));
			}
			dispatch(actionInterfaceSetDirectorySelection([]));
			dispatch(
				actionInterfacePushNotification({
					tone: "success",
					title:
						targets.length > 1
							? `Deleted ${targets.length} items`
							: `Deleted ${props.name}`,
				}),
			);
		} catch (error) {
			dispatch(
				actionInterfacePushNotification({
					tone: "error",
					title: `Could not delete ${props.name}`,
					detail: failureMessage(error),
				}),
			);
		}
	}, [
		activeFile?.path,
		clip,
		dispatch,
		openFiles,
		props.name,
		removeEntry,
		targets,
	]);

	const queueClipboard = useCallback(
		(mode: "copy" | "cut") => {
			if (targets.length > 1) {
				dispatch(
					actionInterfaceSetDirectoryClipboard({ mode, entries: targets }),
				);
				dispatch(
					actionInterfacePushNotification({
						tone: "info",
						title:
							mode === "cut"
								? `Cut ${targets.length} items`
								: `Copied ${targets.length} items`,
					}),
				);
				return;
			}
			const entry = currentEntry;
			const next = nextClipboard(clip, { mode, entry });
			dispatch(actionInterfaceSetDirectoryClipboard(next));
			const title = clipboardNotice(clip, next, {
				mode,
				name: props.name,
				path: props.fullPath,
			});
			if (title) {
				dispatch(actionInterfacePushNotification({ title, tone: "info" }));
			}
		},
		[clip, currentEntry, dispatch, props.fullPath, props.name, targets],
	);
	const onCopy = useCallback(() => {
		queueClipboard("copy");
	}, [queueClipboard]);
	const onCut = useCallback(() => {
		queueClipboard("cut");
	}, [queueClipboard]);

	const onPaste = useCallback(async () => {
		if (!clip?.entries.length) return;
		let files = openFiles;
		let active = activeFile?.path;
		let count = 0;
		try {
			for (const entry of clip.entries) {
				if (
					props.fullPath === entry.path ||
					props.fullPath.startsWith(`${entry.path}/`)
				) {
					continue;
				}
				const target = joinedPath(props.fullPath, entry.name);
				if (clip.mode === "cut" && target === entry.path) continue;
				if (clip.mode === "cut") {
					const moved = await moveEntry({
						sourcePath: entry.path,
						targetPath: target,
						options: { force: true },
					}).unwrap();
					const placed = pathsAfterRename(files, {
						path: entry.path,
						nextPath: moved.path ?? target,
						active,
					});
					files = placed.openFiles;
					active = placed.activeFile;
				} else {
					await copyEntry({
						sourcePath: entry.path,
						targetPath: target,
						options: { force: true },
					}).unwrap();
				}
				count += 1;
			}
			if (clip.mode === "cut") {
				dispatch(
					actionInterfaceUpdate({ openFiles: files, activeFile: active }),
				);
				dispatch(actionInterfaceSetDirectoryClipboard(null));
			}
			dispatch(actionInterfacePushNotification(pasteNotice(count)));
		} catch (error) {
			dispatch(
				actionInterfacePushNotification({
					tone: "error",
					title: "Could not paste",
					detail: failureMessage(error),
				}),
			);
		}
	}, [
		activeFile?.path,
		clip,
		copyEntry,
		dispatch,
		moveEntry,
		openFiles,
		props.fullPath,
	]);

	const cutLabel = clipboardActionLabel(clip, {
		mode: "cut",
		path: props.fullPath,
	});
	const copyLabel = clipboardActionLabel(clip, {
		mode: "copy",
		path: props.fullPath,
	});

	return {
		onNewFile,
		onNewFolder,
		onRename,
		onDelete,
		onCopy,
		onCut,
		onPaste,
		cutLabel,
		copyLabel,
		pasteText: clip?.entries.length ? pasteLabel(clip) : null,
	};
}
