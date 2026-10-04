import { useCallback } from "react";
import { FileState } from "@/components/FileState";
import { useTextFile } from "@/lib/files/use-text-file";
import { parseQueryError, useParseVcardQuery } from "@/lib/redux/queries/parse";
import ViewerVCard from "@/lib/ui/ViewerVCard";

export default function ScreenVCard() {
	const file = useTextFile();
	const skip = file.text.trim().length === 0;
	const parsed = useParseVcardQuery(
		{ text: file.text },
		{ skip: skip || file.processing },
	);
	const parseError = parsed.isError
		? parseQueryError(parsed.error, "Could not read this vCard file")
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
			emptyLabel="No contacts to display"
			onRetry={retry}
		>
			{parsed.data ? <ViewerVCard key={file.path} cards={parsed.data} /> : null}
		</FileState>
	);
}
