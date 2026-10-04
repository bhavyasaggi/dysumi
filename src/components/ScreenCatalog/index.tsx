import { useCallback } from "react";
import { FileState } from "@/components/FileState";
import { useTextFile } from "@/lib/files/use-text-file";
import {
	parseQueryError,
	useParseCatalogQuery,
} from "@/lib/redux/queries/parse";
import ViewerCatalog from "@/lib/ui/ViewerCatalog";
import type { CatalogKind } from "@/lib/utils/catalog/parse";

function catalogKind(path: string): CatalogKind {
	const extension = path.split(".").pop()?.toLowerCase();
	if (
		extension === "arb" ||
		extension === "po" ||
		extension === "pot" ||
		extension === "strings" ||
		extension === "xlf" ||
		extension === "xliff" ||
		extension === "xlif"
	) {
		return extension;
	}
	return "arb";
}

export default function ScreenCatalog() {
	const file = useTextFile();
	const kind = catalogKind(file.path);
	const skip = file.text.trim().length === 0;
	const parsed = useParseCatalogQuery(
		{ text: file.text, kind },
		{ skip: skip || file.processing },
	);
	const parseError = parsed.isError
		? parseQueryError(parsed.error, "Could not read this catalog")
		: "";
	const error = file.error || parseError;
	const processing =
		file.processing || (!skip && (parsed.isUninitialized || parsed.isLoading));
	const retry = useCallback(() => {
		file.retry();
		if (!skip) parsed.refetch();
	}, [file, parsed, skip]);
	return (
		<FileState
			processing={processing}
			error={file.isUntitled ? "" : error}
			empty={!(processing || error || parsed.data)}
			emptyLabel="No messages to display"
			onRetry={retry}
		>
			{parsed.data ? (
				<ViewerCatalog key={file.path} document={parsed.data} />
			) : null}
		</FileState>
	);
}
