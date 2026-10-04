import {
	ActionIcon,
	Button,
	Combobox,
	Divider,
	Group,
	Text,
	useCombobox,
} from "@mantine/core";
import {
	type ChangeEvent,
	useCallback,
	useDeferredValue,
	useState,
} from "react";
import { useReduxDispatch } from "@/lib/redux/hooks";
import { actionInterfaceUpdate } from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";

export default function InterfaceShellActivityFiles(props: {
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

	const options = props.data ?? [];
	const optionsFiltered = (props.data ?? []).filter((item) =>
		item.path.toLowerCase().includes(searchDeferred.toLowerCase().trim()),
	);

	const onOptionSubmit = useCallback(
		(value: string) => {
			props.onChange?.(value);
			combobox.closeDropdown();
		},
		[combobox, props.onChange],
	);

	const onToggleDropdown = useCallback(() => {
		combobox.toggleDropdown();
	}, [combobox]);

	const onSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setSearch(event.currentTarget.value);
	}, []);

	const onCloseAll = useCallback(() => {
		dispatch(
			actionInterfaceUpdate({
				openFiles: [{ name: "Untitled", path: "untitled:__init.md" }],
				activeFile: "untitled:__init.md",
			}),
		);
	}, [dispatch]);

	return (
		<Combobox
			store={combobox}
			width={240}
			position="bottom-end"
			dropdownPadding={0}
			shadow="sm"
			onOptionSubmit={onOptionSubmit}
		>
			<Combobox.Target withAriaAttributes={false}>
				<ActionIcon
					disabled={props.disabled ?? options.length === 0}
					variant="subtle"
					color="gray"
					onClick={onToggleDropdown}
					flex="0 0 auto"
					aria-label="More file actions"
				>
					<Icon
						icon="more-horizontal"
						height={16}
						width={16}
						title="Icon More"
					/>
				</ActionIcon>
			</Combobox.Target>
			<Combobox.Dropdown hidden={options.length === 0}>
				<Combobox.Header p={0}>
					<Group wrap="nowrap" gap={0}>
						<Combobox.Search
							flex="1 1 auto"
							size="xs"
							value={search}
							onChange={onSearchChange}
							aria-label="Search open files"
							placeholder="Search open files…"
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
							onClick={onCloseAll}
						>
							Close all
						</Button>
					</Group>
				</Combobox.Header>
				<Combobox.Options
					mah={200}
					style={{ overflow: "hidden auto", scrollbarWidth: "thin" }}
				>
					{optionsFiltered.length > 0 ? (
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
