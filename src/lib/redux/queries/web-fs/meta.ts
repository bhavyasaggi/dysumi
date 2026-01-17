import {
	type FileProcessorEntry,
	getFileWorkerApi,
} from "@/lib/file-worker-api";
import { webFsApi } from "./index";

export const webFsMetaApi = webFsApi.injectEndpoints({
	endpoints: (builder) => ({
		getWebFsRecentHandles: builder.query<string[] | undefined, void>({
			providesTags: ["DIRECTORY_RECENT"],
			queryFn: async () => {
				try {
					const worker = await getFileWorkerApi();
					const data = await worker.listHandleKeys();
					return { data };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
		openWebFsHandle: builder.mutation<FileProcessorEntry, "directory" | "file">(
			{
				invalidatesTags: ["DIRECTORY_RECENT"],
				queryFn: async (mode) => {
					try {
						if (
							!(
								"showDirectoryPicker" in globalThis &&
								"showOpenFilePicker" in globalThis
							)
						) {
							return {
								error: {
									status: "UNSUPPORTED",
									error: "FileSystem is not supported in your browser.",
								},
							};
						}
						let handle: FileSystemHandle | undefined;
						if (mode === "file") {
							// biome-ignore lint/suspicious/noExplicitAny: Unable to declare
							[handle] = await (globalThis as any).showOpenFilePicker({
								multiple: false,
							});
						} else if (mode === "directory") {
							// biome-ignore lint/suspicious/noExplicitAny: Unable to declare
							handle = await (globalThis as any).showDirectoryPicker();
						}
						// biome-ignore lint/suspicious/noExplicitAny: Unable to declare
						const permission = await (handle as any).requestPermission({
							mode: "readwrite",
						});
						if (permission !== "granted") {
							return {
								error: {
									status: "PERMISSION_DENIED",
									error: "Permission denied.",
								},
							};
						}
						if (handle) {
							const worker = await getFileWorkerApi();
							const data = await worker.open(handle);
							return { data };
						}
						return {
							error: {
								status: "UNSUPPORTED",
								error: "FileSystem is not supported in your browser.",
							},
						};
					} catch (error) {
						return { error: { status: "FETCH_ERROR", error: String(error) } };
					}
				},
			},
		),
		closeWebFsHandle: builder.mutation<{ success: boolean }, { path?: string }>(
			{
				queryFn: async ({ path }) => {
					try {
						const worker = await getFileWorkerApi();
						const data = await worker.close(path);
						return { data };
					} catch (error) {
						return { error: { status: "FETCH_ERROR", error: String(error) } };
					}
				},
			},
		),
		refreshWebFsHandle: builder.mutation<
			undefined,
			{ path: string; mode: "read" | "readwrite"; type?: "opfs" }
		>({
			invalidatesTags: [
				"DIRECTORY_RECENT",
				"DIRECTORY_STRUCTURE",
				"FILE_METADATA",
			],
			queryFn: async ({ path, mode, type }) => {
				try {
					const worker = await getFileWorkerApi();
					const data = await worker.getHandle(path, { type: type });
					if (!(data instanceof FileSystemHandle)) {
						return {
							error: {
								status: "INVALID_HANDLE",
								error: "Invalid handle.",
							},
						};
					}
					// biome-ignore lint/suspicious/noExplicitAny: Unable to declare
					const permission = await (data as any).requestPermission({
						mode: mode,
					});
					if (permission !== "granted") {
						return {
							error: {
								status: "PERMISSION_DENIED",
								error: "Permission denied.",
							},
						};
					}
					return { data: undefined };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
		listWebFsDirectory: builder.query<FileProcessorEntry[], { path: string }>({
			providesTags: (_result, _error, { path }) => [
				{ type: "DIRECTORY_STRUCTURE", id: path },
			],
			queryFn: async ({ path }) => {
				try {
					const worker = await getFileWorkerApi();
					const data = await worker.list(path);
					return { data };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
		metaWebFsEntry: builder.query<FileProcessorEntry, { path: string }>({
			providesTags: (_result, _error, { path }) => [
				{ type: "FILE_METADATA", id: path },
			],
			queryFn: async ({ path }) => {
				try {
					const worker = await getFileWorkerApi();
					const data = await worker.meta(path);
					return { data };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
	}),
});

export const {
	useGetWebFsRecentHandlesQuery,
	useOpenWebFsHandleMutation,
	useCloseWebFsHandleMutation,
	useRefreshWebFsHandleMutation,
	useListWebFsDirectoryQuery,
	useMetaWebFsEntryQuery,
} = webFsMetaApi;
