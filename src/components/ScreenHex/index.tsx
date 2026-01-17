import { Paper } from "@mantine/core";
import { hexy } from "hexy";
import { useMemo } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";

export default function ScreenRaw() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);

	const fileWithProto = Boolean(activeFile?.path?.includes(":"));

	const {
		currentData: webFsFile,
		error: webFsFileError,
		isUninitialized: isUninitializedWebFsFile,
		isLoading: isLoadingWebFsFile,
		isFetching: isFetchingWebFsFile,
		isError: isErrorWebFsFile,
	} = useReadWebFsFileQuery(
		{
			path: activeFile?.path || "",
		},
		{ skip: fileWithProto },
	);

	const processing =
		(!fileWithProto && isUninitializedWebFsFile) ||
		isLoadingWebFsFile ||
		isFetchingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;
	const data = useMemo(
		() => hexy(webFsFile?.content || ""),
		[webFsFile?.content],
	);

	if (processing) {
		return (
			<div>
				<p>Processing...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div>
				<p>Error: {error}</p>
			</div>
		);
	}

	return (
		<Paper component="pre" mih="100%" m={0} p="xs" fz="sm">
			{data || ""}
		</Paper>
	);
}
