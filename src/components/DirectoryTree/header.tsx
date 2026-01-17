import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
	Button,
	type ButtonProps,
	Menu,
	ScrollArea,
	Space,
	Text,
} from "@mantine/core";
import { useHover } from "@mantine/hooks";
import type { FeatherIconNames } from "feather-icons";
import { Activity, useState } from "react";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import {
	actionInterfaceOpenFile,
	selectorInterfaceGetActiveFile,
} from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";

export default function DirectoryTreeHeader(props: {
	name: string;
	fullPath: string;
	isDirectory?: boolean;
	isFile?: boolean;
	isDirty?: boolean;
	level?: number;
	disabled?: boolean;
	mimetype?: string;
	size?: number;
	lastModified?: number;
	loading?: boolean;
	error?: string;
	opened?: boolean;
	onOpened?: (opened: boolean) => void;
}) {
	const dispatch = useReduxDispatch();
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);

	const { hovered, ref: hoveredRef } = useHover();
	const [openContextMenu, setOpenContextMenu] = useState(false);

	const {
		attributes,
		listeners,
		setNodeRef: setDraggableNodeRef,
		transform,
		isDragging,
	} = useDraggable({
		id: props.fullPath,
		disabled: !props.fullPath || props.loading || !!props.error,
	});

	const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
		id: props.fullPath,
		disabled:
			!props.isDirectory || !props.fullPath || props.loading || !!props.error,
	});

	let icon: FeatherIconNames = "file";
	if (props.loading) {
		icon = "loader";
	} else if (props.error) {
		icon = "alert-triangle";
	} else if (props.isDirectory) {
		icon = "folder";
	}

	let color: ButtonProps["color"] = "gray";
	if (props.error) {
		color = "red";
	} else if (isOver) {
		color = "dark";
	}

	const isActive = activeFile?.path === props.fullPath;

	return (
		<Menu
			opened={openContextMenu}
			onClose={() => setOpenContextMenu(false)}
			position="bottom-end"
			shadow="sm"
			// width="target"
			withArrow={true}
			withOverlay={true}
			offset={-8}
			arrowOffset={12}
		>
			<Menu.Target>
				<Button.Group ref={hoveredRef}>
					<Button
						ref={(node) => {
							setDroppableNodeRef(node);
							setDraggableNodeRef(node);
						}}
						style={{
							paddingLeft: `calc(${props.level || 1} * 0.25rem)`,
							transform: transform
								? `translate3d(${transform.x}px, ${transform.y}px, 0)`
								: undefined,
							zIndex: isDragging ? "var(--mantine-z-index-max)" : undefined,
						}}
						opacity={isDragging ? 0.6 : undefined}
						{...listeners}
						{...attributes}
						disabled={props.disabled || isDragging}
						variant={
							isActive || isDragging || isOver ? "subtle" : "transparent"
						}
						color={color}
						size="compact-sm"
						justify="start"
						fullWidth={true}
						leftSection={
							<>
								{props.isDirectory ? (
									<Icon
										icon={props.opened ? "chevron-down" : "chevron-right"}
										title={props.opened ? "Collapse" : "Expand"}
										height={14}
										width={14}
									/>
								) : (
									<Space h={14} w={14} />
								)}
								<Icon
									icon={icon}
									title={props.name || "..."}
									height={14}
									width={14}
									style={{ marginLeft: "4px" }}
								/>
							</>
						}
						onClick={() => {
							props.onOpened?.(!props.opened);
							if (props.fullPath && !props.isDirectory) {
								dispatch(
									actionInterfaceOpenFile({
										name: props.name || "unknown",
										path: props.fullPath,
									}),
								);
							}
						}}
						onContextMenu={(event) => {
							event.preventDefault();
							setOpenContextMenu(true);
						}}
					>
						<Text
							span
							size="sm"
							truncate="end"
							td={hovered ? "underline" : undefined}
						>
							{props.loading ? "loading..." : null}
							{!props.loading && props.error ? props.error : null}
							{!props.loading && !props.error ? props.name || "..." : null}
						</Text>
					</Button>
					<Activity
						mode={
							openContextMenu ||
							(hovered && !props.disabled && !isDragging && !isOver)
								? "visible"
								: "hidden"
						}
					>
						<Button
							variant={isActive ? "light" : "transparent"}
							color={color}
							size="compact-sm"
							aria-label="More Options"
							title="More Options"
							onClick={() => {
								setOpenContextMenu(!openContextMenu);
							}}
							onContextMenu={(event) => {
								event.preventDefault();
								setOpenContextMenu(true);
							}}
						>
							<Icon
								icon="more-horizontal"
								title="More Options"
								height={14}
								width={14}
							/>
						</Button>
					</Activity>
				</Button.Group>
			</Menu.Target>
			<Menu.Dropdown p={0}>
				{openContextMenu ? (
					<ScrollArea.Autosize mah="70dvh">
						{props.isDirectory ? (
							<>
								<Menu.Item>New File</Menu.Item>
								<Menu.Item>New Folder</Menu.Item>
								<Menu.Divider />
							</>
						) : null}
						<Menu.Item>Cut</Menu.Item>
						<Menu.Item>Copy</Menu.Item>
						{props.isDirectory ? <Menu.Item>Paste</Menu.Item> : null}
						<Menu.Divider />
						<Menu.Item>Rename</Menu.Item>
						<Menu.Item>Delete</Menu.Item>
					</ScrollArea.Autosize>
				) : null}
			</Menu.Dropdown>
		</Menu>
	);
}
