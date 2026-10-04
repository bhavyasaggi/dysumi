import { Menu } from "@mantine/core";
import { useEntryActions } from "./use-entry-actions";

export default function DirectoryActions(props: {
	name: string;
	fullPath: string;
	isDirectory?: boolean;
	isRoot?: boolean;
}) {
	const actions = useEntryActions(props);

	return (
		<>
			{props.isDirectory ? (
				<>
					<Menu.Item onClick={actions.onNewFile}>New File</Menu.Item>
					<Menu.Item onClick={actions.onNewFolder}>New Folder</Menu.Item>
					{actions.pasteText ? (
						<Menu.Item onClick={actions.onPaste}>{actions.pasteText}</Menu.Item>
					) : null}
				</>
			) : null}
			{props.isRoot ? null : (
				<>
					{props.isDirectory ? <Menu.Divider /> : null}
					<Menu.Item
						disabled={actions.cutLabel === "Included in cut"}
						onClick={actions.onCut}
					>
						{actions.cutLabel}
					</Menu.Item>
					<Menu.Item
						disabled={actions.copyLabel === "Included in copy"}
						onClick={actions.onCopy}
					>
						{actions.copyLabel}
					</Menu.Item>
					<Menu.Divider />
					<Menu.Item onClick={actions.onRename}>Rename</Menu.Item>
					<Menu.Item color="red" onClick={actions.onDelete}>
						Delete
					</Menu.Item>
				</>
			)}
		</>
	);
}
