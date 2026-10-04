import { combineSlices, configureStore } from "@reduxjs/toolkit";

import { idbListener, storageListener } from "./listeners";
import { draftsApi, readDraftMap } from "./queries/drafts";
import { parseApi } from "./queries/parse";
import { webFsApi } from "./queries/web-fs";
import { readSession, webLlmApi } from "./queries/web-llm";
import { interfaceSlice } from "./slices/interface";
import { sessionSlice } from "./slices/session";

export const makeStore = () => {
	const store = configureStore({
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware({
				// Ignore serializable check for binary file content
				// webFsApi handles Uint8Array for binary file operations
				serializableCheck: {
					ignoredActions: [
						"webFsApi/executeQuery/fulfilled",
						"webFsApi/executeQuery/pending",
						"webFsApi/executeMutation/fulfilled",
						"webFsApi/executeMutation/pending",
						"parseApi/executeQuery/fulfilled",
						"parseApi/executeQuery/pending",
					],
					ignoredActionPaths: [
						"payload.content",
						"meta.arg.content",
						"meta.baseQueryMeta",
					],
					ignoredPaths: [
						"webFsApi.queries",
						"webFsApi.mutations",
						"parseApi.queries",
					],
				},
			})
				.concat(webFsApi.middleware)
				.concat(parseApi.middleware)
				.concat(webLlmApi.middleware)
				.concat(draftsApi.middleware)
				.prepend(storageListener.middleware)
				.prepend(idbListener.middleware),
		reducer: combineSlices(
			sessionSlice,
			interfaceSlice,
			webFsApi,
			parseApi,
			webLlmApi,
			draftsApi,
		),
	});

	store.dispatch(
		draftsApi.util.upsertQueryData("getDrafts", undefined, readDraftMap()),
	);
	store.dispatch(
		webLlmApi.util.upsertQueryData("getWebLlmChat", undefined, readSession()),
	);

	return store;
};

// Infer the type of makeStore
export type ReduxStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `ReduxDispatch` types from the store itself
export type ReduxRootState = ReturnType<ReduxStore["getState"]>;
export type ReduxDispatch = ReduxStore["dispatch"];
