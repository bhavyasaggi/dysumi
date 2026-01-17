import { getFileWorkerApi } from "@/lib/file-worker-api";
import { webFsApi } from "./index";

export const webFsModifyApi = webFsApi.injectEndpoints({
	endpoints: (builder) => ({
		createWebFsFile: builder.mutation<
			{ success: boolean },
			{ path: string; options?: { force?: boolean } }
		>({
			invalidatesTags: (_result, _error, { path }) => [
				{
					type: "DIRECTORY_STRUCTURE",
					id: path.split("/").slice(0, -1).join("/"),
				},
				{ type: "FILE_CONTENT", id: path },
				{ type: "FILE_METADATA", id: path },
			],
			queryFn: async ({ path, options }) => {
				try {
					const worker = await getFileWorkerApi();
					const data = await worker.createFile(path, options);
					return { data };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
		createWebFsDirectory: builder.mutation<
			{ success: boolean },
			{ path: string; options?: { force?: boolean } }
		>({
			invalidatesTags: (_result, _error, { path }) => [
				{
					type: "DIRECTORY_STRUCTURE",
					id: path.split("/").slice(0, -1).join("/"),
				},
				{ type: "FILE_METADATA", id: path },
			],
			queryFn: async ({ path, options }) => {
				try {
					const worker = await getFileWorkerApi();
					const data = await worker.createDirectory(path, options);
					return { data };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
		deleteWebFsEntry: builder.mutation<{ success: boolean }, { path: string }>({
			invalidatesTags: (_result, _error, { path }) => [
				{
					type: "DIRECTORY_STRUCTURE",
					id: path.split("/").slice(0, -1).join("/"),
				},
				{ type: "FILE_CONTENT", id: path },
				{ type: "FILE_METADATA", id: path },
			],
			queryFn: async ({ path }) => {
				try {
					const worker = await getFileWorkerApi();
					const data = await worker.remove(path);
					return { data };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
		copyWebFsEntry: builder.mutation<
			{ success: boolean },
			{
				sourcePath: string;
				targetPath: string;
				options?: { force?: boolean };
			}
		>({
			invalidatesTags: (_result, _error, { targetPath }) => {
				return [
					{
						type: "DIRECTORY_STRUCTURE" as const,
						id: targetPath.split("/").slice(0, -1).join("/"),
					},
					{
						type: "DIRECTORY_STRUCTURE" as const,
						id: targetPath,
					},
					{
						type: "FILE_CONTENT" as const,
						id: targetPath,
					},
					{
						type: "FILE_METADATA" as const,
						id: targetPath,
					},
				];
			},
			queryFn: async ({ sourcePath, targetPath, options }) => {
				try {
					if (sourcePath === targetPath) {
						return { data: { success: true } };
					}
					const worker = await getFileWorkerApi();
					const data = await worker.copy(sourcePath, targetPath, options);
					return { data };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
		moveWebFsEntry: builder.mutation<
			{ success: boolean },
			{
				sourcePath: string;
				targetPath: string;
				options?: { force?: boolean };
			}
		>({
			invalidatesTags: (_result, _error, { sourcePath, targetPath }) => {
				return [
					{
						type: "DIRECTORY_STRUCTURE" as const,
						id: sourcePath.split("/").slice(0, -1).join("/"),
					},
					{
						type: "DIRECTORY_STRUCTURE" as const,
						id: sourcePath,
					},
					{
						type: "DIRECTORY_STRUCTURE" as const,
						id: targetPath.split("/").slice(0, -1).join("/"),
					},
					{
						type: "DIRECTORY_STRUCTURE" as const,
						id: targetPath,
					},
					{ type: "FILE_CONTENT" as const, id: targetPath },
					{ type: "FILE_METADATA" as const, id: targetPath },
				];
			},
			queryFn: async ({ sourcePath, targetPath, options }) => {
				try {
					if (sourcePath === targetPath) {
						return { data: { success: true } };
					}
					const worker = await getFileWorkerApi();
					const data = await worker.copy(sourcePath, targetPath, options);
					await worker.remove(sourcePath);
					return { data };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
	}),
});

export const {
	useCreateWebFsFileMutation,
	useCreateWebFsDirectoryMutation,
	useDeleteWebFsEntryMutation,
	useCopyWebFsEntryMutation,
	useMoveWebFsEntryMutation,
} = webFsModifyApi;
