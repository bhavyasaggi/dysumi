import { Box, NavLink, Text, UnstyledButton } from "@mantine/core";
import type { FeatherIconNames } from "feather-icons";
import { useCallback, useState } from "react";
import { useReduxDispatch } from "@/lib/redux/hooks";
import {
	useCloseWebFsHandleMutation,
	useGetWebFsRecentHandlesQuery,
	useOpenWebFsHandleMutation,
	useRefreshWebFsHandleMutation,
} from "@/lib/redux/queries/web-fs/meta";
import {
	actionInterfacePushNotification,
	actionInterfaceUpdate,
} from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";

function RecentFolderLink({
	path,
	onOpen,
}: {
	path: string;
	onOpen: (path: string) => Promise<void>;
}) {
	const handleOpen = useCallback(async () => {
		await onOpen(path);
	}, [onOpen, path]);

	return (
		<NavLink
			component={UnstyledButton}
			variant="subtle"
			label={
				<Text size="sm" truncate="end">
					{path}
				</Text>
			}
			leftSection={<Icon icon="folder" height={16} width={16} title="Folder" />}
			onClick={handleOpen}
		/>
	);
}

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

	const openRecent = useCallback(
		async (path: string) => {
			try {
				await closeWebFsHandleMutation({}).unwrap();
				await refreshWebFsHandleMutation({
					path,
					mode: "readwrite",
				}).unwrap();
				dispatch(
					actionInterfaceUpdate({
						viewPanel: "explorer",
						workspacePath: path,
					}),
				);
			} catch (error) {
				dispatch(
					actionInterfacePushNotification({
						tone: "error",
						title: "Could not open that folder",
						detail: error instanceof Error ? error.message : String(error),
					}),
				);
			}
		},
		[closeWebFsHandleMutation, dispatch, refreshWebFsHandleMutation],
	);

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
					<RecentFolderLink key={item} path={item} onOpen={openRecent} />
				))}
			</Box>
		</NavLink>
	);
}

export default function PanelWelcome() {
	const dispatch = useReduxDispatch();

	const onCreateFile = useCallback(() => {
		dispatch(
			actionInterfacePushNotification({
				tone: "info",
				title: "Open a folder, then choose New File",
			}),
		);
	}, [dispatch]);

	const [openWebFsHandleMutation] = useOpenWebFsHandleMutation();
	const openFolder = useCallback(async () => {
		try {
			const data = await openWebFsHandleMutation("directory").unwrap();
			dispatch(
				actionInterfaceUpdate({
					viewPanel: "explorer",
					workspacePath: data.fullPath,
				}),
			);
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			if (detail.includes("abort") || detail.includes("Abort")) return;
			dispatch(
				actionInterfacePushNotification({
					tone: "error",
					title: "Could not open a folder",
					detail,
				}),
			);
		}
	}, [dispatch, openWebFsHandleMutation]);

	return (
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
				onClick={onCreateFile}
			/>
			<NavLink
				component={UnstyledButton}
				active
				variant="subtle"
				label="Open a Folder"
				leftSection={
					<Icon icon="folder" height={16} width={16} title="Open Folder" />
				}
				onClick={openFolder}
			/>
			<PanelWelcomeRecent />
		</Box>
	);
}
