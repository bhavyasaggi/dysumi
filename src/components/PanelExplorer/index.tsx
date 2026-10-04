import { Alert, Text } from "@mantine/core";
import type React from "react";
import DirectoryTree, { DirectoryTreeRoot } from "@/components/DirectoryTree";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import { pathsAfterRename } from "@/lib/redux/open-files";
import { useMoveWebFsEntryMutation } from "@/lib/redux/queries/web-fs/modify";
import {
	actionInterfacePushNotification,
	actionInterfaceUpdate,
	selectorInterfaceGetActiveFile,
	selectorInterfaceGetDirectorySelection,
	selectorInterfaceGetIsReady,
	selectorInterfaceGetOpenFiles,
	selectorInterfaceGetWorkspacePath,
} from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";

export default function PanelExplorer() {
	const dispatch = useReduxDispatch();
	const isReady = useReduxSelector(selectorInterfaceGetIsReady);
	const workspacePath = useReduxSelector(selectorInterfaceGetWorkspacePath);
	const openFiles = useReduxSelector(selectorInterfaceGetOpenFiles);
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const selection = useReduxSelector(selectorInterfaceGetDirectorySelection);

	const [moveWebFsEntryMutation, { isLoading: isLoadingMoveWebFsEntry }] =
		useMoveWebFsEntryMutation();

	const handleDragEnd: React.ComponentProps<
		typeof DirectoryTreeRoot
	>["onDragEnd"] = async (event) => {
		const { active, over } = event;
		if (!(active && over) || active.id === over.id) return;
		const sourcePath = String(active.id || "");
		const targetPath = String(over.id || "");
		if (!(sourcePath && targetPath)) return;
		const sources = selection.some((item) => item.path === sourcePath)
			? selection.map((item) => item.path)
			: [sourcePath];
		let files = openFiles;
		let activePath = activeFile?.path;
		try {
			for (const source of sources) {
				if (
					source === targetPath ||
					targetPath.startsWith(`${source}/`) ||
					source === workspacePath
				) {
					continue;
				}
				const targetName = source.split("/").pop() || "untitled.md";
				const destination = `${targetPath}/${targetName}`;
				const moved = await moveWebFsEntryMutation({
					sourcePath: source,
					targetPath: destination,
					options: { force: true },
				}).unwrap();
				const placed = pathsAfterRename(files, {
					path: source,
					nextPath: moved.path ?? destination,
					active: activePath,
				});
				files = placed.openFiles;
				activePath = placed.activeFile;
			}
			dispatch(
				actionInterfaceUpdate({ openFiles: files, activeFile: activePath }),
			);
		} catch (error) {
			dispatch(
				actionInterfacePushNotification({
					tone: "error",
					title: "Could not move the selection",
					detail: error instanceof Error ? error.message : "The move failed",
				}),
			);
		}
	};

	if (!isReady) {
		return (
			<Text role="status" c="dimmed" size="sm" p="sm">
				Loading…
			</Text>
		);
	}

	return (
		<DirectoryTreeRoot onDragEnd={handleDragEnd}>
			{workspacePath ? (
				<>
					{selection.length > 1 ? (
						<Text size="xs" c="dimmed" px="sm" pt="xs">
							{selection.length} selected. Ctrl-click to change the selection.
						</Text>
					) : null}
					<DirectoryTree
						defaultOpened={true}
						name={workspacePath || "OPFS"}
						fullPath={workspacePath || ""}
						isDirectory={true}
						disabled={!isReady || isLoadingMoveWebFsEntry}
					/>
				</>
			) : (
				<Alert
					title="Empty workspace"
					variant="light"
					color="gray"
					icon={
						<Icon icon="info" height={16} width={16} title="Icon Alert Info" />
					}
					h="calc(100dvh - 1.8rem - 1.8rem)"
				>
					Open a folder to continue. You can drop files onto a folder after it
					is open.
				</Alert>
			)}
		</DirectoryTreeRoot>
	);
}
