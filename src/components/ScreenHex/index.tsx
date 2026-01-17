import { Center, Loader } from "@mantine/core";
import { useThrottledCallback } from "@mantine/hooks";
import { useCallback, useMemo } from "react";
import { useReduxSelector } from "@/lib/redux/hooks";
import {
	useEditWebFsFileBinaryMutation,
	useReadWebFsFileBinaryQuery,
} from "@/lib/redux/queries/web-fs/read-write";
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
		{
			path: activeFile?.path || "",
		},
		{ skip: fileWithProto },
	);

	const [editWebFsFileBinaryMutation] = useEditWebFsFileBinaryMutation();
	const editWebFsFileBinaryMutationThrottled = useThrottledCallback(
		async (content: Uint8Array) => {
			if (!activeFile?.path) {
				return;
			}
			try {
				// Create a copy to avoid transferring the original buffer
				const contentCopy = new Uint8Array(content);
				await editWebFsFileBinaryMutation({
					path: activeFile.path,
					content: contentCopy,
				}).unwrap();
			} catch (error) {
				console.error(error);
			}
		},
		2000,
	);

	const processing =
		(!fileWithProto && !isUntitledHex && isUninitializedWebFsFile) ||
		isLoadingWebFsFile;
	const error = isErrorWebFsFile
		? String((webFsFileError as Error)?.message)
		: undefined;

	// Memoize the initial data to avoid recreating on every render
	const initialData = useMemo(() => {
		if (isUntitledHex) {
			// For new untitled hex files, start with empty buffer
			return new Uint8Array(0);
		}
		return webFsFile?.content || new Uint8Array(0);
	}, [webFsFile?.content, isUntitledHex]);

	const handleChange = useCallback(
		(data: Uint8Array) => {
			editWebFsFileBinaryMutationThrottled(data);
		},
		[editWebFsFileBinaryMutationThrottled],
	);

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

	return (
		<EditorHex
			key={activeFile?.path}
			defaultValue={initialData}
			onChange={handleChange}
			readOnly={false}
		/>
	);
}
