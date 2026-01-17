import {
	ActionIcon,
	Button,
	Combobox,
	Divider,
	Group,
	Text,
	useCombobox,
} from "@mantine/core";
import type { FeatherIconNames } from "feather-icons";
import React, { useContext, useDeferredValue, useState } from "react";
import { DynamicContext } from "@/components/DynamicBoundary/context";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import { useMetaWebFsEntryQuery } from "@/lib/redux/queries/web-fs/meta";
import {
	actionInterfaceCloseFile,
	actionInterfaceOpenFile,
	actionInterfaceUpdate,
	selectorInterfaceGetActiveFile,
	selectorInterfaceGetIsReady,
	selectorInterfaceGetOpenFiles,
} from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";

const ActivityBarItem = React.memo(function ActivityBarItemRaw(props: {
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

function ActivityBarFiles(props: {
	disabled?: boolean;
	data?: Array<{
		name: string;
		path: string;
	}>;
	value?: {
		name: string;
		path: string;
	};
	onChange?: (value: string) => void;
}) {
	const dispatch = useReduxDispatch();

	const [search, setSearch] = useState("");
	const searchDeferred = useDeferredValue(search, "");

	const combobox = useCombobox({
		onDropdownClose: () => {
			combobox.resetSelectedOption();
			combobox.focusTarget();
			setSearch("");
		},
		onDropdownOpen: () => {
			combobox.focusSearchInput();
		},
	});

	const options = props.data || [];
	const optionsFiltered = (props.data || []).filter((item) =>
		item.path.toLowerCase().includes(searchDeferred.toLowerCase().trim()),
	);

	return (
		<Combobox
			store={combobox}
			width={240}
			position="bottom-end"
			dropdownPadding={0}
			shadow="sm"
			onOptionSubmit={(value) => {
				props.onChange?.(value);
				combobox.closeDropdown();
			}}
		>
			<Combobox.Target withAriaAttributes={false}>
				<ActionIcon
					disabled={props.disabled || !options.length}
					variant="subtle"
					color="gray"
					onClick={() => combobox.toggleDropdown()}
					flex="0 0 auto"
				>
					<Icon
						icon="more-horizontal"
						height={16}
						width={16}
						title="Icon More"
					/>
				</ActionIcon>
			</Combobox.Target>
			<Combobox.Dropdown hidden={!options.length}>
				<Combobox.Header p={0}>
					<Group wrap="nowrap" gap={0}>
						<Combobox.Search
							flex="1 1 auto"
							size="xs"
							value={search}
							onChange={(event) => setSearch(event.currentTarget.value)}
							placeholder="search..."
						/>
						<Button
							size="xs"
							variant="subtle"
							color="gray"
							flex="0 0 auto"
							rightSection={
								<Icon
									icon="x-circle"
									title="Close All"
									height={16}
									width={16}
								/>
							}
							aria-label="Close All"
							title="Close All"
							onClick={() => {
								// TODO: Ask to save dirty files iteratively
								dispatch(
									actionInterfaceUpdate({
										openFiles: [
											{ name: "Untitled", path: "untitled:__init.md" },
										],
										activeFile: "untitled:__init.md",
									}),
								);
							}}
						>
							Close all
						</Button>
					</Group>
				</Combobox.Header>
				<Combobox.Options
					mah={200}
					style={{ overflow: "hidden auto", scrollbarWidth: "thin" }}
				>
					{optionsFiltered.length ? (
						optionsFiltered.map((item) => {
							const label = item.path.includes(":") ? item.name : item.path;
							return (
								<Combobox.Option
									key={item.path}
									value={item.path}
									title={label}
								>
									<Text size="xs" ff="monospace" truncate="start">
										{label}
									</Text>
								</Combobox.Option>
							);
						})
					) : (
						<Combobox.Empty>
							<Divider label="No match" />
						</Combobox.Empty>
					)}
				</Combobox.Options>
			</Combobox.Dropdown>
		</Combobox>
	);
}

export default function ActivityBar() {
	const dispatch = useReduxDispatch();

	const openFiles = useReduxSelector(selectorInterfaceGetOpenFiles);
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);

	const interfaceReady = useReduxSelector(selectorInterfaceGetIsReady);
	const { clientReady } = useContext(DynamicContext);

	const isReady = clientReady && interfaceReady;

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
						<ActivityBarItem
							key={file.path}
							active={activeFile?.path === file.path}
							{...file}
						/>
					))
				) : (
					<Text span>...</Text>
				)}
			</Group>
			<ActivityBarFiles
				disabled={!isReady}
				data={openFiles}
				value={activeFile}
				onChange={(value) => {
					const nextActiveFile = openFiles.find((f) => f.path === value);
					if (nextActiveFile) {
						dispatch(actionInterfaceOpenFile(nextActiveFile));
					}
				}}
			/>
		</Group>
	);
}
