import { Group, Text } from "@mantine/core";
import { useCallback } from "react";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import {
	actionInterfaceOpenFile,
	selectorInterfaceGetActiveFile,
	selectorInterfaceGetIsReady,
	selectorInterfaceGetOpenFiles,
} from "@/lib/redux/slices/interface";

import InterfaceShellActivityFiles from "../ActivityFiles";
import InterfaceShellActivityItem from "../ActivityItem";

export default function InterfaceShellActivity() {
	const dispatch = useReduxDispatch();

	const openFiles = useReduxSelector(selectorInterfaceGetOpenFiles);
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const isReady = useReduxSelector(selectorInterfaceGetIsReady);

	const onFileChange = useCallback(
		(value: string) => {
			const nextActiveFile = openFiles.find((f) => f.path === value);
			if (nextActiveFile) {
				dispatch(actionInterfaceOpenFile(nextActiveFile));
			}
		},
		[dispatch, openFiles],
	);

	return (
		<Group wrap="nowrap" gap={0}>
			<Group
				wrap="nowrap"
				gap={0}
				flex="1 1 auto"
				style={{ overflow: "auto hidden", scrollbarWidth: "thin" }}
			>
				{isReady ? (
					openFiles.map((file) => (
						<InterfaceShellActivityItem
							key={file.path}
							active={activeFile?.path === file.path}
							{...file}
						/>
					))
				) : (
					<Text span>...</Text>
				)}
			</Group>
			<InterfaceShellActivityFiles
				disabled={!isReady}
				data={openFiles}
				value={activeFile}
				onChange={onFileChange}
			/>
		</Group>
	);
}
