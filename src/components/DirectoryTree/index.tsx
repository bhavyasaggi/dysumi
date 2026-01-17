import {
	DndContext,
	type DndContextProps,
	PointerSensor,
	pointerWithin,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { Text } from "@mantine/core";
import React, { useState } from "react";
import {
	useListWebFsDirectoryQuery,
	useMetaWebFsEntryQuery,
} from "@/lib/redux/queries/web-fs/meta";

import DirectoryTreeHeader from "./header";

interface DirectoryTreeProps {
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
}

function DirectoryTreeRoot(props: {
	onDragEnd?: DndContextProps["onDragEnd"];
	children?: React.ReactNode;
}) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
	);

	return (
		<DndContext
			onDragEnd={props.onDragEnd}
			sensors={sensors}
			collisionDetection={pointerWithin}
		>
			{props.children}
		</DndContext>
	);
}

function DirectoryTreeBody(props: DirectoryTreeProps) {
	const { data, isUninitialized, isLoading, isFetching, isError, error } =
		useListWebFsDirectoryQuery({
			path: props.fullPath,
		});

	const processing = isUninitialized || isLoading || isFetching;

	return (
		<>
			{processing || isError ? (
				<DirectoryTreeHeader
					{...props}
					disabled={props.disabled || processing}
					name={processing ? "processing..." : JSON.stringify(error)}
					error={processing ? undefined : JSON.stringify(error)}
					loading={processing}
				/>
			) : null}
			{!processing && !isError
				? (data || []).map((entry) => (
						<DirectoryTree
							key={entry.name}
							{...props}
							{...entry}
							disabled={props.disabled || processing}
							level={(props.level || 1) + 1}
						/>
					))
				: null}
		</>
	);
}

const DirectoryTree = React.memo(function DirectoryTreeRaw(
	props: DirectoryTreeProps & {
		defaultOpened?: boolean;
	},
) {
	const [opened, setOpened] = useState(Boolean(props.defaultOpened));

	const { data, isUninitialized, isLoading, isFetching, isError, error } =
		useMetaWebFsEntryQuery({
			path: props.fullPath,
		});

	const processing = isUninitialized || isLoading || isFetching;

	if (isError) {
		return (
			<Text size="xs" c="red">
				<code>{JSON.stringify(error)}</code>
			</Text>
		);
	}

	return (
		<>
			<DirectoryTreeHeader
				opened={opened}
				onOpened={setOpened}
				fullPath={data?.fullPath || props.fullPath}
				isDirectory={data?.isDirectory || props.isDirectory}
				isFile={data?.isFile || props.isFile}
				isDirty={data?.isDirty || props.isDirty}
				mimetype={data?.mimetype || props.mimetype}
				size={data?.size || props.size}
				lastModified={data?.lastModified || props.lastModified}
				disabled={props.disabled || processing}
				level={props.level || 1}
				error={isError ? JSON.stringify(error) : undefined}
				name={processing ? "processing..." : props.name || data?.name}
			/>
			{processing || data?.isFile || !opened ? null : (
				<DirectoryTreeBody
					name={props.name}
					fullPath={props.fullPath}
					isDirectory={props.isDirectory}
					isFile={props.isFile}
					isDirty={props.isDirty}
					mimetype={props.mimetype}
					size={props.size}
					lastModified={props.lastModified}
					disabled={props.disabled || processing}
					level={(props.level || 1) + 1}
				/>
			)}
		</>
	);
});

export { DirectoryTreeHeader, DirectoryTreeBody, DirectoryTreeRoot };

export default DirectoryTree;
