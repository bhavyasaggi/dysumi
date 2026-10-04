import { useReduxSelector } from "@/lib/redux/hooks";
import { useReadWebFsFileQuery } from "@/lib/redux/queries/web-fs/read-write";
import { selectorInterfaceGetActiveFile } from "@/lib/redux/slices/interface";

function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function useTextFile() {
	const activeFile = useReduxSelector(selectorInterfaceGetActiveFile);
	const path = activeFile?.path ?? "";
	const isUntitled = path.startsWith("untitled:");
	const skip = path.includes(":") || isUntitled;
	const query = useReadWebFsFileQuery({ path }, { skip });
	return {
		path,
		text: query.currentData?.content ?? "",
		uninitialized: !skip && query.isUninitialized,
		loading: query.isLoading,
		processing: (!skip && query.isUninitialized) || query.isLoading,
		error: query.isError ? messageOf(query.error) : "",
		isUntitled,
		retry: query.refetch,
	};
}
