import { getFileWorkerApi } from "@/lib/file-worker-api";
import { webFsApi } from "./index";

export const webFsReadWriteApi = webFsApi.injectEndpoints({
	endpoints: (builder) => ({
		readWebFsFile: builder.query<
			{
				name: string;
				content: string;
				size?: number;
				type?: string;
				lastModified?: number;
			},
			{ path: string }
		>({
			providesTags: (_result, _error, { path }) => [
				{ type: "FILE_CONTENT", id: path },
			],
			queryFn: async ({ path }) => {
				try {
					const worker = await getFileWorkerApi();
					const data = await worker.read(path);
					return { data };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
		writeWebFsFile: builder.mutation<
			{ success: boolean },
			{ path: string; content: string }
		>({
			invalidatesTags: (_result, _error, { path }) => [
				{ type: "FILE_CONTENT" as const, id: path },
				{ type: "FILE_METADATA" as const, id: path },
			],
			queryFn: async ({ path, content }) => {
				try {
					const worker = await getFileWorkerApi();
					const data = await worker.write(path, content);
					return { data };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
		editWebFsFile: builder.mutation<
			{ success: boolean },
			{ path: string; content: string }
		>({
			invalidatesTags: (_result, _error, { path }) => [
				{ type: "FILE_CONTENT" as const, id: path },
				{ type: "FILE_METADATA" as const, id: path },
			],
			queryFn: async ({ path, content }) => {
				try {
					const worker = await getFileWorkerApi();
					const data = await worker.edit(path, content);
					return { data };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
		saveWebFsFile: builder.mutation<{ success: boolean }, { path: string }>({
			invalidatesTags: (_result, _error, { path }) => [
				{ type: "FILE_CONTENT" as const, id: path },
				{ type: "FILE_METADATA" as const, id: path },
			],
			queryFn: async ({ path }) => {
				try {
					const worker = await getFileWorkerApi();
					const data = await worker.save(path);
					return { data };
				} catch (error) {
					return { error: { status: "FETCH_ERROR", error: String(error) } };
				}
			},
		}),
	}),
});

export const {
	useReadWebFsFileQuery,
	useWriteWebFsFileMutation,
	useEditWebFsFileMutation,
	useSaveWebFsFileMutation,
} = webFsReadWriteApi;
