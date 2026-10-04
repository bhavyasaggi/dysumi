import { Center, Loader, Stack, Text } from "@mantine/core";
import { useReduxSelector } from "@/lib/redux/hooks";
import {
	parseQueryError,
	useParseFinanceQuery,
} from "@/lib/redux/queries/parse";
import { useReadWebFsFileQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import ViewerFinance from "@/lib/ui/ViewerFinance";
import type { FinanceKind } from "@/lib/utils/finance/parse";

function kindOf(path: string): FinanceKind {
	const extension = path.split(".").pop()?.toLowerCase();
	if (extension === "qfx" || extension === "qif") return extension;
	return "ofx";
}

export default function ScreenFinance() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const filePath = activeFile?.path ?? "";
	const kind = kindOf(filePath);
	const fileWithProto = Boolean(filePath.includes(":"));
	const isUntitled = filePath.startsWith("untitled:");

	const {
		currentData: webFsFile,
		error: webFsFileError,
		isUninitialized,
		isLoading,
		isError,
	} = useReadWebFsFileQuery(
		{ path: filePath },
		{ skip: fileWithProto || isUntitled },
	);

	const content = webFsFile?.content;
	const parsed = useParseFinanceQuery(
		{ text: content ?? "", financeKind: kind },
		{ skip: !content },
	);
	const parsing = Boolean(content) && !parsed.data && !parsed.isError;

	const processing =
		(!(fileWithProto || isUntitled) && isUninitialized) || isLoading || parsing;
	const error = isError
		? String((webFsFileError as Error)?.message)
		: undefined;

	if (processing) {
		return (
			<Center py="xl" px="sm" h="100%" role="status" aria-label="Loading…">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error && !isUntitled) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Stack align="center" gap="sm">
					<Text c="red" role="alert">
						Error: {error}
					</Text>
				</Stack>
			</Center>
		);
	}

	if (!webFsFile?.content) {
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="dimmed">No statement to display</Text>
			</Center>
		);
	}

	if (parsed.isError || !parsed.data) {
		const parseError = parseQueryError(
			parsed.error,
			"Could not read this statement",
		);
		return (
			<Center py="xl" px="sm" h="100%">
				<Text c="red" role="alert">
					{parseError}
				</Text>
			</Center>
		);
	}

	return <ViewerFinance key={activeFile?.path} statement={parsed.data} />;
}
