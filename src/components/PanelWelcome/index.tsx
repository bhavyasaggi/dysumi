import {
	Anchor,
	Box,
	Divider,
	NavLink,
	Text,
	UnstyledButton,
} from "@mantine/core";
import type { FeatherIconNames } from "feather-icons";
import { useState } from "react";
import InterfaceShellPanel from "@/components/InterfaceShell/panel";
import { useReduxDispatch } from "@/lib/redux/hooks";
import {
	useCloseWebFsHandleMutation,
	useGetWebFsRecentHandlesQuery,
	useOpenWebFsHandleMutation,
	useRefreshWebFsHandleMutation,
} from "@/lib/redux/queries/web-fs/meta";
import { actionInterfaceUpdate } from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";

function PanelWelcomeRecent() {
	const [opened, setOpened] = useState(true);

	const dispatch = useReduxDispatch();

	const {
		data: fsRecent,
		isUninitialized: isUninitializedFsRecent,
		isLoading: isLoadingFsRecent,
		isFetching: isFetchingFsRecent,
	} = useGetWebFsRecentHandlesQuery();

	const [closeWebFsHandleMutation, { isLoading: isLoadingCloseWebFsHandle }] =
		useCloseWebFsHandleMutation();
	const [
		refreshWebFsHandleMutation,
		{ isLoading: isLoadingRefreshWebFsHandle },
	] = useRefreshWebFsHandleMutation();

	const loading =
		isUninitializedFsRecent ||
		isLoadingFsRecent ||
		isFetchingFsRecent ||
		isLoadingCloseWebFsHandle ||
		isLoadingRefreshWebFsHandle;
	const empty = !fsRecent || fsRecent.length <= 0;

	let statusIcon: FeatherIconNames | undefined;
	if (loading) {
		statusIcon = "loader";
	} else if (empty) {
		statusIcon = "x-circle";
	}

	return (
		<NavLink
			active={true}
			disabled={loading || empty}
			opened={opened}
			onChange={setOpened}
			component={UnstyledButton}
			variant={opened ? "filled" : "subtle"}
			label="Open Recent"
			leftSection={
				<Icon icon="clock" height={16} width={16} title="Open Recent" />
			}
			rightSection={
				statusIcon ? (
					<Icon
						icon={statusIcon}
						title={`Icon ${statusIcon}`}
						height={16}
						width={16}
					/>
				) : undefined
			}
			childrenOffset={0}
		>
			<Box style={{ border: "1px solid var(--mantine-color-default-border)" }}>
				{(fsRecent || []).map((item) => (
					<NavLink
						key={item}
						component={UnstyledButton}
						variant="subtle"
						label={
							<Text size="sm" truncate="end">
								{item}
							</Text>
						}
						leftSection={
							<Icon icon="folder" height={16} width={16} title="Folder" />
						}
						onClick={async () => {
							await closeWebFsHandleMutation({}).unwrap();
							await refreshWebFsHandleMutation({
								path: item,
								mode: "readwrite",
							}).unwrap();
							dispatch(
								actionInterfaceUpdate({
									viewPanel: "explorer",
									workspacePath: item,
								}),
							);
						}}
					/>
				))}
			</Box>
		</NavLink>
	);
}

export default function PanelWelcome() {
	const dispatch = useReduxDispatch();

	const [openWebFsHandleMutation] = useOpenWebFsHandleMutation();

	return (
		<InterfaceShellPanel title="Welcome!">
			<Box p="sm">
				<Text c="gray">Get Started.</Text>

				<NavLink
					component={UnstyledButton}
					active
					variant="subtle"
					label="Create a new File"
					leftSection={
						<Icon icon="file-plus" height={16} width={16} title="New File" />
					}
				/>
				<NavLink
					component={UnstyledButton}
					active
					variant="subtle"
					label="Open a Folder"
					leftSection={
						<Icon icon="folder" height={16} width={16} title="Open Folder" />
					}
					onClick={async () => {
						try {
							const data = await openWebFsHandleMutation("directory").unwrap();
							dispatch(
								actionInterfaceUpdate({
									viewPanel: "explorer",
									workspacePath: data.fullPath,
								}),
							);
						} catch (error) {
							window.alert(String(error));
						}
					}}
				/>
				<PanelWelcomeRecent />
			</Box>
		</InterfaceShellPanel>
	);
}
