import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { readDraftMap } from "@/lib/redux/queries/drafts";
import type { ChatTurn } from "@/lib/webllm/engine";

export type WebLlmMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
};

type ModelStatus = {
	loadedId: string;
	requestedId: string;
	progress: number;
	progressText: string;
	error: string | null;
};

type ChatState = {
	messages: WebLlmMessage[];
	draft: string;
	modelId: string;
	loadedId: string;
	sending: boolean;
	error: string | null;
};

const SESSION_KEY = "__dysumi_webllm";

const SYSTEM_PROMPT =
	"You are a helpful assistant inside dysumi. Keep answers concise.";
const FILE_CONTEXT_LIMIT = 24_000;

const emptyModel = (): ModelStatus => ({
	loadedId: "",
	requestedId: "",
	progress: 0,
	progressText: "",
	error: null,
});

const emptyChat = (): ChatState => ({
	messages: [],
	draft: "",
	modelId: "",
	loadedId: "",
	sending: false,
	error: null,
});

function storedMessages(value: unknown) {
	if (!Array.isArray(value)) return [];
	const messages: WebLlmMessage[] = [];
	for (const item of value) {
		if (!item || typeof item !== "object") continue;
		const record = item as Record<string, unknown>;
		if (typeof record.id !== "string" || typeof record.content !== "string") {
			continue;
		}
		if (record.role !== "user" && record.role !== "assistant") continue;
		messages.push({
			id: record.id,
			role: record.role,
			content: record.content,
		});
	}
	return messages;
}

export function readSession(): ChatState {
	try {
		const value = JSON.parse(
			globalThis.localStorage.getItem(SESSION_KEY) ?? "{}",
		) as Record<string, unknown>;
		return {
			...emptyChat(),
			messages: storedMessages(value.messages),
			draft: typeof value.draft === "string" ? value.draft : "",
			modelId: typeof value.modelId === "string" ? value.modelId : "",
			loadedId: typeof value.loadedId === "string" ? value.loadedId : "",
		};
	} catch {
		return emptyChat();
	}
}

function rememberSession(state: ChatState) {
	try {
		globalThis.localStorage.setItem(
			SESSION_KEY,
			JSON.stringify({
				messages: state.messages,
				draft: state.draft,
				modelId: state.modelId,
				loadedId: state.loadedId,
			}),
		);
	} catch {
		// The browser refused the write. The open chat still has the text.
	}
}

function progressPercent(value: number) {
	if (value <= 1) return Math.round(value * 100);
	return Math.min(100, Math.round(value));
}

function failureText(error: unknown) {
	if (typeof error === "string" && error) {
		return error.replace(/^Error:\s*/, "");
	}
	if (error instanceof Error && error.message) return error.message;
	return "The model request failed";
}

function fileNote(name: string, path: string, text: string) {
	const body =
		text.length > FILE_CONTEXT_LIMIT
			? `${text.slice(0, FILE_CONTEXT_LIMIT)}\n…`
			: text;
	return `The open file is "${name}" (${path}).\n\n${body}`;
}

async function openFileNote(state: unknown) {
	const root = state as {
		interface?: {
			activeFile?: string;
			openFiles?: { name: string; path: string }[];
		};
	};
	const path = root.interface?.activeFile;
	if (!path) return "";
	const name =
		root.interface?.openFiles?.find((file) => file.path === path)?.name ||
		path.split("/").pop() ||
		path;
	if (path.includes(":")) {
		const text = readDraftMap()[path] ?? "";
		return text
			? fileNote(name, path, text)
			: `The open file is "${name}" and it is empty.`;
	}
	try {
		const { getFileWorkerApi } = await import("@/lib/file-worker-api");
		const worker = await getFileWorkerApi();
		const file = await worker.read(path);
		if (!file) return `The open file is "${name}" (${path}).`;
		const content = file.content ?? "";
		if (content.includes("\u0000") || (file.size ?? 0) > 200_000) {
			return `The open file is "${name}" (${path}). It is binary or too large to include.`;
		}
		return fileNote(name, path, content);
	} catch {
		return `The open file is "${name}" (${path}).`;
	}
}

let loadTicket = 0;

export const webLlmApi = createApi({
	reducerPath: "webLlmApi",
	baseQuery: fakeBaseQuery(),
	keepUnusedDataFor: 60 * 60 * 24,
	endpoints: (builder) => ({
		resumeWebLlmModel: builder.query<{ resumed: boolean }, void>({
			queryFn: async (_arg, api) => {
				const saved = readSession().loadedId;
				if (!(saved && navigator.gpu)) return { data: { resumed: false } };
				try {
					const adapter = await navigator.gpu.requestAdapter();
					if (!adapter) return { data: { resumed: false } };
					const { ensureModel, loadedModelId } = await import(
						"@/lib/webllm/engine"
					);
					if (loadedModelId() === saved) return { data: { resumed: true } };
					api.dispatch(
						webLlmApi.util.upsertQueryData("getWebLlmModel", undefined, {
							loadedId: "",
							requestedId: saved,
							progress: 0,
							progressText: "Loading the model…",
							error: null,
						}),
					);
					await ensureModel(saved, {
						onProgress: (report) => {
							api.dispatch(
								webLlmApi.util.updateQueryData(
									"getWebLlmModel",
									undefined,
									(draft) => {
										draft.progress = progressPercent(report.progress);
										draft.progressText = report.text;
									},
								),
							);
						},
					});
					const loaded = loadedModelId();
					api.dispatch(
						webLlmApi.util.updateQueryData(
							"getWebLlmModel",
							undefined,
							(draft) => {
								draft.loadedId = loaded;
								draft.requestedId = saved;
								draft.progress = 100;
								draft.progressText = "";
								draft.error = null;
							},
						),
					);
					return { data: { resumed: true } };
				} catch (error) {
					const message = failureText(error);
					api.dispatch(
						webLlmApi.util.updateQueryData(
							"getWebLlmModel",
							undefined,
							(draft) => {
								draft.error = message;
								draft.progressText = "";
							},
						),
					);
					return { error: { status: "CUSTOM_ERROR", error: message } };
				}
			},
		}),
		getWebGpu: builder.query<boolean, void>({
			queryFn: async () => {
				const gpu = navigator.gpu;
				if (!gpu) return { data: false };
				try {
					const adapter = await gpu.requestAdapter();
					return { data: Boolean(adapter) };
				} catch {
					return { data: false };
				}
			},
		}),
		getWebLlmModel: builder.query<ModelStatus, void>({
			queryFn: async () => {
				const { loadedModelId } = await import("@/lib/webllm/engine");
				const loadedId = loadedModelId();
				return {
					data: {
						...emptyModel(),
						loadedId,
						progress: loadedId ? 100 : 0,
					},
				};
			},
		}),
		getWebLlmChat: builder.query<ChatState, void>({
			queryFn: () => ({ data: readSession() }),
		}),
		loadWebLlmModel: builder.mutation<{ modelId: string }, { modelId: string }>(
			{
				queryFn: async ({ modelId }, api) => {
					const ticket = ++loadTicket;
					const write = (patch: Partial<ModelStatus>) => {
						if (ticket !== loadTicket) return;
						api.dispatch(
							webLlmApi.util.updateQueryData(
								"getWebLlmModel",
								undefined,
								(draft) => {
									Object.assign(draft, patch);
								},
							),
						);
					};
					write({
						requestedId: modelId,
						progress: 0,
						progressText: "Loading the model…",
						error: null,
					});
					try {
						const { ensureModel, loadedModelId } = await import(
							"@/lib/webllm/engine"
						);
						await ensureModel(modelId, {
							onProgress: (report) => {
								write({
									progress: progressPercent(report.progress),
									progressText: report.text,
								});
							},
						});
						const loaded = loadedModelId();
						write({
							loadedId: loaded,
							requestedId: modelId,
							progress: 100,
							progressText: "",
							error: null,
						});
						api.dispatch(
							webLlmApi.util.updateQueryData(
								"getWebLlmChat",
								undefined,
								(draft) => {
									draft.loadedId = loaded;
									rememberSession(draft);
								},
							),
						);
						return { data: { modelId: loaded } };
					} catch (error) {
						const message = failureText(error);
						write({ error: message, progressText: "" });
						return { error: { status: "CUSTOM_ERROR", error: message } };
					}
				},
			},
		),
		sendWebLlmChat: builder.mutation<
			{ sent: true },
			{ content: string; history: WebLlmMessage[] }
		>({
			queryFn: async ({ content, history }, api) => {
				const user: WebLlmMessage = {
					id: crypto.randomUUID(),
					role: "user",
					content,
				};
				const assistantId = crypto.randomUUID();
				const fileContext = await openFileNote(api.getState());
				const turns: ChatTurn[] = [
					{
						role: "system",
						content: fileContext
							? `${SYSTEM_PROMPT}\n\n${fileContext}`
							: SYSTEM_PROMPT,
					},
					...history.map((item) => ({
						role: item.role,
						content: item.content,
					})),
					{ role: "user", content },
				];
				const write = (recipe: (draft: ChatState) => void) => {
					api.dispatch(
						webLlmApi.util.updateQueryData("getWebLlmChat", undefined, recipe),
					);
				};
				write((draft) => {
					draft.messages = [
						...history,
						user,
						{ id: assistantId, role: "assistant", content: "" },
					];
					draft.draft = "";
					draft.sending = true;
					draft.error = null;
					rememberSession(draft);
				});
				try {
					const { streamReply } = await import("@/lib/webllm/engine");
					await streamReply(turns, {
						onDelta: (text) => {
							write((draft) => {
								const item = draft.messages.find(
									(entry) => entry.id === assistantId,
								);
								if (item) item.content = text;
								rememberSession(draft);
							});
						},
					});
					write((draft) => {
						draft.sending = false;
						rememberSession(draft);
					});
					return { data: { sent: true } };
				} catch (error) {
					const message = failureText(error);
					write((draft) => {
						draft.sending = false;
						draft.error = message;
						rememberSession(draft);
					});
					return { error: { status: "CUSTOM_ERROR", error: message } };
				}
			},
		}),
		patchWebLlmSession: builder.mutation<
			{ patched: true },
			{ draft?: string; modelId?: string }
		>({
			queryFn: (patch, api) => {
				api.dispatch(
					webLlmApi.util.updateQueryData(
						"getWebLlmChat",
						undefined,
						(draft) => {
							if (patch.draft !== undefined) draft.draft = patch.draft;
							if (patch.modelId !== undefined) draft.modelId = patch.modelId;
							rememberSession(draft);
						},
					),
				);
				return { data: { patched: true } };
			},
		}),
		clearWebLlmChat: builder.mutation<{ cleared: true }, void>({
			queryFn: (_arg, api) => {
				api.dispatch(
					webLlmApi.util.updateQueryData(
						"getWebLlmChat",
						undefined,
						(draft) => {
							draft.messages = [];
							draft.draft = "";
							draft.sending = false;
							draft.error = null;
							rememberSession(draft);
						},
					),
				);
				return { data: { cleared: true } };
			},
		}),
	}),
});

export const {
	useGetWebGpuQuery,
	useResumeWebLlmModelQuery,
	useGetWebLlmModelQuery,
	useGetWebLlmChatQuery,
	useLoadWebLlmModelMutation,
	useSendWebLlmChatMutation,
	usePatchWebLlmSessionMutation,
	useClearWebLlmChatMutation,
} = webLlmApi;
