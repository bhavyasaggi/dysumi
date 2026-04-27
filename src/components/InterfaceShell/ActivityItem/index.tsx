import { ActionIcon, Button, Group, Text } from "@mantine/core";
import type { FeatherIconNames } from "feather-icons";
import React from "react";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import { useMetaWebFsEntryQuery } from "@/lib/redux/queries/web-fs/meta";
import {
	actionInterfaceCloseFile,
	actionInterfaceOpenFile,
	selectorInterfaceGetIsReady,
} from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";

export default React.memo(function InterfaceShellActivityItem(props: {
	active?: boolean;
	name: string;
	path: string;
	children?: React.ReactNode;
}) {
	const dispatch = useReduxDispatch();

	const isReady = useReduxSelector(selectorInterfaceGetIsReady);
	const { currentData, isUninitialized, isLoading, isFetching, isError } =
		useMetaWebFsEntryQuery({ path: props.path }, { skip: !isReady });

	let icon: FeatherIconNames = "file";
	if (!isReady || isUninitialized || isLoading || isFetching) {
		icon = "loader";
	} else if (currentData?.isDirty) {
		icon = "edit-3";
	}

	return (
		<Group
			gap={0}
			wrap="nowrap"
			flex="0 0 auto"
			bg={props.active ? "var(--mantine-color-disabled)" : undefined}
		>
			<Button
				variant="transparent"
				size="compact-sm"
				color={isError ? "red" : "gray"}
				title={props.path.includes(":") ? props.name : props.path}
				leftSection={
					<Icon icon={icon} height={14} width={14} title="Icon File" />
				}
				onClick={() => {
					dispatch(
						actionInterfaceOpenFile({ name: props.name, path: props.path }),
					);
				}}
			>
				<Text span size="xs" maw={120}>
					{currentData?.name || props.name || "loading..."}
				</Text>
			</Button>
			{props.children}
			<ActionIcon
				variant="transparent"
				color="gray"
				onClick={() => {
					dispatch(actionInterfaceCloseFile(props.path));
				}}
			>
				<Icon icon="x" title="Icon Close" height={14} width={14} />
			</ActionIcon>
		</Group>
	);
});
