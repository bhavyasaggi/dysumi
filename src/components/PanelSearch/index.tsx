import { NavLink, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import {
	type ChangeEvent,
	type KeyboardEvent,
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import { useListWebFsNamesQuery } from "@/lib/redux/queries/web-fs/meta";
import {
	actionInterfaceOpenFile,
	selectorInterfaceGetViewPanel,
	selectorInterfaceGetWorkspacePath,
} from "@/lib/redux/slices/interface";
import Icon from "@/lib/ui/Icon";
import { matchFileNames, NAME_MATCH_LIMIT, nameIndex } from "./match";

function namesError(error: unknown) {
	if (!error || typeof error !== "object" || !("error" in error)) {
		return "Could not read file names";
	}
	const detail = error.error;
	if (typeof detail !== "string" || detail.length === 0) {
		return "Could not read file names";
	}
	return detail.replace(/^Error: /, "");
}

function searchStatus(options: {
	workspace?: string;
	totalFiles?: number;
	fetching: boolean;
	error?: string;
	query: string;
	shown: number;
	matched: number;
}) {
	if (!options.workspace) return "Open a folder to search its files.";
	if (options.error && options.totalFiles == null) return options.error;
	if (options.totalFiles == null) return "Indexing file names…";
	const updating = options.fetching ? ". Updating…" : "";
	if (!options.query.trim()) return `${options.totalFiles} files${updating}`;
	if (options.matched === 0) return `No matching files${updating}`;
	if (options.matched > options.shown) {
		return `Showing ${options.shown} of ${options.matched}${updating}`;
	}
	const label = options.matched === 1 ? "1 file" : `${options.matched} files`;
	return `${label}${updating}`;
}

function NameHit(props: { path: string; onOpen: (path: string) => void }) {
	const onClick = useCallback(() => {
		props.onOpen(props.path);
	}, [props.onOpen, props.path]);
	return (
		<li>
			<NavLink
				component={UnstyledButton}
				variant="subtle"
				label={
					<Text size="sm" truncate="end">
						{props.path}
					</Text>
				}
				leftSection={
					<Icon icon="file" height={14} width={14} title={props.path} />
				}
				onClick={onClick}
			/>
		</li>
	);
}

export default function PanelSearch() {
	const dispatch = useReduxDispatch();
	const workspace = useReduxSelector(selectorInterfaceGetWorkspacePath);
	const viewPanel = useReduxSelector(selectorInterfaceGetViewPanel);
	const names = useListWebFsNamesQuery(
		{ path: workspace ?? "" },
		{ skip: !workspace },
	);
	const inputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const index = useMemo(() => nameIndex(names.data ?? []), [names.data]);
	const matched = useMemo(
		() => matchFileNames(index, deferredQuery, { limit: NAME_MATCH_LIMIT }),
		[deferredQuery, index],
	);

	useEffect(() => {
		if (viewPanel !== "search") return;
		inputRef.current?.focus();
	}, [viewPanel]);

	const onQuery = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setQuery(event.currentTarget.value);
	}, []);

	const openRelative = useCallback(
		(relative: string) => {
			if (!workspace) return;
			const name = relative.split("/").pop() || relative;
			dispatch(
				actionInterfaceOpenFile({
					name,
					path: `${workspace}/${relative}`,
				}),
			);
		},
		[dispatch, workspace],
	);
	const onInputKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key !== "Enter") return;
			const first = matched.paths[0];
			if (!first) return;
			event.preventDefault();
			openRelative(first);
		},
		[matched.paths, openRelative],
	);

	const status = searchStatus({
		workspace,
		totalFiles: names.data?.length,
		fetching: names.isFetching,
		error: names.isError ? namesError(names.error) : undefined,
		query: deferredQuery,
		shown: matched.paths.length,
		matched: matched.total,
	});

	return (
		<>
			<Stack
				gap={4}
				px="xs"
				py="xs"
				bg="var(--mantine-color-body)"
				style={{ position: "sticky", top: 0, zIndex: 2 }}
			>
				<TextInput
					ref={inputRef}
					aria-label="Search file names"
					placeholder="helper.txt"
					value={query}
					onChange={onQuery}
					onKeyDown={onInputKeyDown}
					leftSection={
						<Icon icon="search" height={14} width={14} title="Search" />
					}
				/>
				<Text size="xs" c="dimmed" role="status">
					{status}
				</Text>
			</Stack>
			{matched.paths.length > 0 ? (
				<Stack
					component="ul"
					gap={0}
					aria-label="Matching files"
					p={0}
					style={{ listStyle: "none" }}
				>
					{matched.paths.map((path) => (
						<NameHit key={path} path={path} onOpen={openRelative} />
					))}
				</Stack>
			) : null}
		</>
	);
}
