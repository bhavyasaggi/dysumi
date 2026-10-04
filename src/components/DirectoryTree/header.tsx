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
import React, { useCallback, useState } from "react";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import {
	useCreateWebFsDirectoryMutation,
	useCreateWebFsFileMutation,
} from "@/lib/redux/queries/web-fs/modify";
import { useWriteWebFsFileBinaryMutation } from "@/lib/redux/queries/web-fs/read-write";
import {
	actionInterfaceOpenFile,
	actionInterfacePushNotification,
	actionInterfaceSetDirectorySelection,
	type DirectorySelectionEntry,
	selectorInterfaceGetActiveFile,
	selectorInterfaceGetDirectorySelection,
} from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";
import { acceptsFileDrop, importDataTransfer } from "./import-drop";

const DirectoryActions = React.lazy(() => import("./actions"));

function nextSelection(
	current: DirectorySelectionEntry[],
	entry: DirectorySelectionEntry,
	toggle: boolean,
) {
	if (!toggle) return [entry];
	if (current.some((item) => item.path === entry.path)) {
		return current.filter((item) => item.path !== entry.path);
	}
	return [...current, entry];
}

function dropDirectory(fullPath: string, isDirectory?: boolean) {
	if (isDirectory) return fullPath;
	const parent = fullPath.split("/").slice(0, -1).join("/");
	return parent || undefined;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: UI component with many conditional branches
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
	const selection = useReduxSelector(selectorInterfaceGetDirectorySelection);
	const [createFile] = useCreateWebFsFileMutation();
	const [createDirectory] = useCreateWebFsDirectoryMutation();
	const [writeBinary] = useWriteWebFsFileBinaryMutation();
	const importDirectory = dropDirectory(props.fullPath, props.isDirectory);

	const { hovered, ref: hoveredRef } = useHover();
	const [openContextMenu, setOpenContextMenu] = useState(false);

	let isInoperable = !props.fullPath;
	if (props.loading) isInoperable = true;
	if (props.error) isInoperable = true;

	const {
		attributes,
		listeners,
		setNodeRef: setDraggableNodeRef,
		transform,
		isDragging,
	} = useDraggable({
		id: props.fullPath,
		disabled: isInoperable,
	});

	const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
		id: props.fullPath,
		disabled: isInoperable || !props.isDirectory,
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
	const isSelected = selection.some((item) => item.path === props.fullPath);

	const closeContextMenu = useCallback(() => {
		setOpenContextMenu(false);
	}, []);

	const setNodeRefs = useCallback(
		(node: HTMLElement | null) => {
			setDroppableNodeRef(node);
			setDraggableNodeRef(node);
		},
		[setDraggableNodeRef, setDroppableNodeRef],
	);

	const onEntryClick = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			const entry = {
				path: props.fullPath,
				name: props.name || "unknown",
				isDirectory: Boolean(props.isDirectory),
			};
			dispatch(
				actionInterfaceSetDirectorySelection(
					nextSelection(selection, entry, event.ctrlKey || event.metaKey),
				),
			);
			if (event.ctrlKey || event.metaKey) return;
			props.onOpened?.(!props.opened);
			if (props.fullPath && !props.isDirectory) {
				dispatch(actionInterfaceOpenFile(entry));
			}
		},
		[dispatch, props, selection],
	);
	const onFileDragOver = useCallback(
		(event: React.DragEvent<HTMLButtonElement>) => {
			if (!(importDirectory && acceptsFileDrop(event.dataTransfer))) return;
			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = "copy";
		},
		[importDirectory],
	);
	const onFileDrop = useCallback(
		(event: React.DragEvent<HTMLButtonElement>) => {
			if (!(importDirectory && acceptsFileDrop(event.dataTransfer))) return;
			event.preventDefault();
			event.stopPropagation();
			const directory = importDirectory;
			importDataTransfer(event.dataTransfer.items, directory, {
				createFile: (path) =>
					createFile({ path, options: { force: true } }).unwrap(),
				createDirectory: (path) =>
					createDirectory({ path, options: { force: true } }).unwrap(),
				writeBinary: (path, content) => writeBinary({ path, content }).unwrap(),
			}).then(
				(count) => {
					dispatch(
						actionInterfacePushNotification({
							tone: count > 0 ? "success" : "info",
							title:
								count === 1 ? "Imported 1 file" : `Imported ${count} files`,
						}),
					);
				},
				(error: unknown) => {
					dispatch(
						actionInterfacePushNotification({
							tone: "error",
							title: "Could not import files",
							detail:
								error instanceof Error ? error.message : "The import failed",
						}),
					);
				},
			);
		},
		[createDirectory, createFile, dispatch, importDirectory, writeBinary],
	);

	const onEntryContextMenu = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			event.preventDefault();
			setOpenContextMenu(true);
		},
		[],
	);

	const toggleContextMenu = useCallback(() => {
		setOpenContextMenu((prev) => !prev);
	}, []);

	return (
		<Menu
			opened={openContextMenu}
			onClose={closeContextMenu}
			position="bottom-end"
			shadow="sm"
			withArrow={true}
			withOverlay={true}
			offset={-8}
			arrowOffset={12}
		>
			<Menu.Target>
				<Button.Group ref={hoveredRef}>
					<Button
						ref={setNodeRefs}
						style={{
							paddingLeft: `calc(${props.level ?? 1} * 0.25rem)`,
							transform: transform
								? `translate3d(${transform.x}px, ${transform.y}px, 0)`
								: undefined,
							zIndex: isDragging ? "var(--mantine-z-index-max)" : undefined,
						}}
						opacity={isDragging ? 0.6 : undefined}
						{...listeners}
						{...attributes}
						disabled={props.disabled ?? isDragging}
						variant={
							isSelected || isActive || isDragging || isOver
								? "light"
								: "transparent"
						}
						color={isSelected ? "blue" : color}
						aria-selected={isSelected}
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
									title={props.name || "…"}
									height={14}
									width={14}
									style={{ marginLeft: "4px" }}
								/>
							</>
						}
						onClick={onEntryClick}
						onContextMenu={onEntryContextMenu}
						onDragOver={onFileDragOver}
						onDrop={onFileDrop}
					>
						<Text
							span
							size="sm"
							truncate="end"
							td={hovered ? "underline" : undefined}
						>
							{props.loading ? "Loading…" : null}
							{!props.loading && props.error ? props.error : null}
							{props.loading || props.error ? null : props.name || "…"}
						</Text>
					</Button>
					<React.Activity
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
							onClick={toggleContextMenu}
							onContextMenu={onEntryContextMenu}
						>
							<Icon
								icon="more-horizontal"
								title="More Options"
								height={14}
								width={14}
							/>
						</Button>
					</React.Activity>
				</Button.Group>
			</Menu.Target>
			<Menu.Dropdown p={0}>
				{openContextMenu ? (
					<ScrollArea.Autosize mah="70dvh">
						<React.Suspense
							fallback={
								<Text size="xs" c="dimmed" p="xs">
									Loading…
								</Text>
							}
						>
							<DirectoryActions
								name={props.name}
								fullPath={props.fullPath}
								isDirectory={props.isDirectory}
								isRoot={(props.level ?? 1) <= 1}
							/>
						</React.Suspense>
					</ScrollArea.Autosize>
				) : null}
			</Menu.Dropdown>
		</Menu>
	);
}
