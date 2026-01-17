import { createSlice, isAnyOf, type PayloadAction } from "@reduxjs/toolkit";

import { storageListener } from "../listeners";

interface OpenFile {
	name: string;
	path: string;
	mode?: "hex" | "normal";
	language?: string;
}

type InitialStateType = {
	isReady: boolean;
	viewPanel?: "welcome" | "explorer" | "search" | "web-llm" | string;
	viewNotificationMuted?: boolean;
	openFiles: OpenFile[];
	activeFile?: string;
	workspacePath?: string;
};

const LOCALSTORAGE_KEY = "__slice_interface";

const initialStateResolver: () => InitialStateType = () => {
	let storageValue: Record<string, unknown> | undefined;
	try {
		storageValue = JSON.parse(
			globalThis.localStorage.getItem(LOCALSTORAGE_KEY) ?? "{}",
		);
	} catch {
		// Gulp
	}
	const { viewMode, viewPanel, viewNotificationMuted } = storageValue || {};
	return {
		isReady: Boolean(globalThis.localStorage),
		viewMode: viewMode ?? "normal",
		viewPanel: viewPanel ?? undefined,
		viewNotificationMuted: viewNotificationMuted ?? false,
		openFiles: [{ name: "Untitled", path: "untitled:__init.md" }],
		activeFile: "untitled:__init.md",
	} as unknown as InitialStateType;
};

export const interfaceSlice = createSlice({
	initialState: initialStateResolver,
	name: "interface",
	reducers: {
		update(state, payload: PayloadAction<Partial<InitialStateType>>) {
			Object.assign(state, payload.payload);
		},
		openFile(state, action: PayloadAction<OpenFile>) {
			const openFileIndex = state.openFiles.findIndex(
				(f) => f.path === action.payload.path,
			);
			if (openFileIndex < 0) {
				state.openFiles.push(action.payload);
			} else {
				state.openFiles[openFileIndex] = {
					...state.openFiles[openFileIndex],
					...action.payload,
				};
			}
			state.activeFile = action.payload.path;
		},
		closeFile(state, action: PayloadAction<string>) {
			const nextOpenFiles = state.openFiles.filter(
				(f) => f.path !== action.payload,
			);
			if (!nextOpenFiles.length) {
				nextOpenFiles.push({
					name: "Untitled",
					path: `untitled:${Math.random().toString(36).slice(2, 10)}.md`,
				});
			}
			state.openFiles = nextOpenFiles;
			if (state.activeFile === action.payload) {
				state.activeFile = nextOpenFiles.at(-1)?.path;
			}
		},
		reorderFiles(state, action: PayloadAction<{ from: number; to: number }>) {
			const { from, to } = action.payload;
			const [moved] = state.openFiles.splice(from, 1);
			state.openFiles.splice(to, 0, moved);
		},
	},
	selectors: {
		getIsReady: (state) => state.isReady,
		getViewPanel: (state) => state.viewPanel,
		getViewNotificationMuted: (state) => state.viewNotificationMuted,
		getOpenFiles: (state) => state.openFiles,
		getActiveFile: (state) => {
			return state.openFiles.find((f) => f.path === state.activeFile);
		},
		getWorkspacePath: (state) => state.workspacePath,
	},
});

export const {
	update: actionInterfaceUpdate,
	openFile: actionInterfaceOpenFile,
	closeFile: actionInterfaceCloseFile,
	reorderFiles: actionInterfaceReorderFiles,
} = interfaceSlice.actions;

export const {
	getIsReady: selectorInterfaceGetIsReady,
	getViewPanel: selectorInterfaceGetViewPanel,
	getViewNotificationMuted: selectorInterfaceGetViewNotificationMuted,
	getOpenFiles: selectorInterfaceGetOpenFiles,
	getActiveFile: selectorInterfaceGetActiveFile,
	getWorkspacePath: selectorInterfaceGetWorkspacePath,
} = interfaceSlice.selectors;

export default interfaceSlice.reducer;

storageListener.startListening({
	effect: (_action, listenerApi) => {
		listenerApi.cancelActiveListeners();
		const state = listenerApi.getState() as { interface: InitialStateType };
		const hasWindow = Boolean(globalThis.window);
		const localStorage = hasWindow ? globalThis.localStorage : undefined;
		if (localStorage) {
			const serialStateInterface: Partial<InitialStateType> = {
				...state.interface,
				// client-only values
				isReady: undefined,
				openFiles: undefined,
				activeFile: undefined,
				workspacePath: undefined,
			};
			localStorage.setItem(
				LOCALSTORAGE_KEY,
				JSON.stringify(serialStateInterface),
			);
		}
	},
	matcher: isAnyOf(actionInterfaceUpdate),
});
