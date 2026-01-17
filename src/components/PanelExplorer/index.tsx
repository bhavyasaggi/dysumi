import { Alert } from "@mantine/core";
import type React from "react";
import DirectoryTree, { DirectoryTreeRoot } from "@/components/DirectoryTree";
import InterfaceShellPanel from "@/components/InterfaceShell/panel";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useMoveWebFsEntryMutation } from "@/lib/redux/queries/web-fs/modify";
import {
	selectorInterfaceGetIsReady,
	selectorInterfaceGetWorkspacePath,
} from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";

export default function PanelExplorer() {
	const isReady = useReduxSelector(selectorInterfaceGetIsReady);
	const workspacePath = useReduxSelector(selectorInterfaceGetWorkspacePath);

	const [moveWebFsEntryMutation, { isLoading: isLoadingMoveWebFsEntry }] =
		useMoveWebFsEntryMutation();

	const handleDragEnd: React.ComponentProps<
		typeof DirectoryTreeRoot
	>["onDragEnd"] = async (event) => {
		const { active, over } = event;
		if (!active || !over || active.id === over.id) {
			return;
		}

		const sourcePath = String(active.id || "");
		const targetPath = String(over.id || "");
		const targetName =
			sourcePath.split("/").pop() ||
			`untitled-${Math.random().toString(36).slice(2, 9)}.md`;

		if (
			sourcePath &&
			targetPath &&
			sourcePath !== targetPath &&
			!targetPath.startsWith(`${sourcePath}/`)
		) {
			await moveWebFsEntryMutation({
				sourcePath,
				targetPath: `${targetPath}/${targetName}`,
				options: { force: true },
			}).unwrap();
		}
	};

	if (!isReady) {
		return "...";
	}

	return (
		<InterfaceShellPanel title="Explorer">
			<DirectoryTreeRoot onDragEnd={handleDragEnd}>
				{workspacePath ? (
					<DirectoryTree
						defaultOpened={true}
						name={workspacePath || "OPFS"}
						fullPath={workspacePath || ""}
						isDirectory={true}
						disabled={!isReady || isLoadingMoveWebFsEntry}
					/>
				) : (
					<Alert
						title="Empty workspace"
						variant="light"
						color="gray"
						icon={
							<Icon
								icon="info"
								height={16}
								width={16}
								title="Icon Alert Info"
							/>
						}
						h="calc(100dvh - 1.8rem - 1.8rem)"
					>
						Open a folder to continue.
					</Alert>
				)}
			</DirectoryTreeRoot>
		</InterfaceShellPanel>
	);
}
