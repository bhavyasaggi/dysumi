import { Center, Loader } from "@mantine/core";
import { useMemo } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileBinaryQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";
import EditorHex from "@/lib/ui/EditorHex";

export default function ScreenHex() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);

	const fileWithProto = Boolean(activeFile?.path?.includes(":"));
	const isUntitledHex = activeFile?.path?.startsWith("untitled:");

	const {
		currentData: webFsFile,
		error: webFsFileError,
		isUninitialized: isUninitializedWebFsFile,
		isLoading: isLoadingWebFsFile,
		isError: isErrorWebFsFile,
	} = useReadWebFsFileBinaryQuery(
		{ path: activeFile?.path || "" },
		{ skip: fileWithProto },
	);

	const processing =
		(!(fileWithProto || isUntitledHex) && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	const initialData = useMemo(() => {
		if (isUntitledHex) return new Uint8Array(0);
		return webFsFile?.content || new Uint8Array(0);
	}, [webFsFile?.content, isUntitledHex]);

	if (processing) {
		return (
			<Center py="xl" px="sm">
				<Loader size="xl" type="dots" color="gray" />
			</Center>
		);
	}

	if (error && !isUntitledHex) {
		return (
			<Center py="xl" px="sm">
				<p>Error: {error}</p>
			</Center>
		);
	}

	return <EditorHex key={activeFile?.path} defaultValue={initialData} />;
}
