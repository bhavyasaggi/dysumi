import { createSlice, isAnyOf, type PayloadAction } from "@reduxjs/toolkit";

import { storageListener } from "../listeners";

interface OpenFile {
	name: string;
	path: string;
	mode?: "hex" | "normal";
	language?: string;
}

type ClipboardEntry = {
	path: string;
	name: string;
	isDirectory: boolean;
};

type DirectoryClipboard = {
	mode: "copy" | "cut";
	entries: ClipboardEntry[];
};

export type DirectorySelectionEntry = {
	path: string;
	name: string;
	isDirectory: boolean;
};

type AppNotification = {
	id: string;
	key?: string;
	title: string;
	detail?: string;
	tone: "success" | "error" | "info";
	at: number;
	read: boolean;
};

type InitialStateType = {
	isReady: boolean;
	viewPanel?: "welcome" | "explorer" | "search" | "web-llm" | string;
	viewNotificationMuted?: boolean;
	openFiles: OpenFile[];
	activeFile?: string;
	workspacePath?: string;
	directoryClipboard: DirectoryClipboard | null;
	directorySelection: DirectorySelectionEntry[];
	notifications: AppNotification[];
};

const LOCALSTORAGE_KEY = "__slice_interface";

function storedOpenFiles(value: unknown) {
	if (!Array.isArray(value)) return undefined;
	const files: OpenFile[] = [];
	for (const item of value) {
		if (!item || typeof item !== "object") continue;
		const record = item as Record<string, unknown>;
		if (typeof record.name !== "string" || typeof record.path !== "string") {
			continue;
		}
		if (!(record.name && record.path)) continue;
		const file: OpenFile = { name: record.name, path: record.path };
		if (record.mode === "hex" || record.mode === "normal")
			file.mode = record.mode;
		if (typeof record.language === "string" && record.language) {
			file.language = record.language;
		}
		files.push(file);
	}
	return files.length > 0 ? files : undefined;
}

const initialStateResolver = (): InitialStateType => {
	let storageValue: Record<string, unknown> | undefined;
	try {
		storageValue = JSON.parse(
			globalThis.localStorage.getItem(LOCALSTORAGE_KEY) ?? "{}",
		);
	} catch {
		// Gulp
	}
	const viewPanel = storageValue?.viewPanel;
	const viewNotificationMuted = storageValue?.viewNotificationMuted;
	const openFiles = storedOpenFiles(storageValue?.openFiles) ?? [
		{ name: "Untitled", path: "untitled:__init.md" },
	];
	const activeRaw = storageValue?.activeFile;
	const activeFile =
		typeof activeRaw === "string" &&
		openFiles.some((file) => file.path === activeRaw)
			? activeRaw
			: openFiles.at(-1)?.path;
	const workspacePath =
		typeof storageValue?.workspacePath === "string" &&
		storageValue.workspacePath
			? storageValue.workspacePath
			: undefined;
	return {
		isReady: Boolean(globalThis.localStorage),
		viewPanel: typeof viewPanel === "string" ? viewPanel : "welcome",
		viewNotificationMuted:
			typeof viewNotificationMuted === "boolean"
				? viewNotificationMuted
				: false,
		openFiles,
		activeFile,
		...(workspacePath ? { workspacePath } : {}),
		directoryClipboard: null,
		directorySelection: [],
		notifications: [],
	};
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
			if (nextOpenFiles.length === 0) {
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
		setDirectoryClipboard(
			state,
			action: PayloadAction<DirectoryClipboard | null>,
		) {
			state.directoryClipboard = action.payload;
		},
		setDirectorySelection(
			state,
			action: PayloadAction<DirectorySelectionEntry[]>,
		) {
			state.directorySelection = action.payload;
		},
		pushNotification(
			state,
			action: PayloadAction<{
				title: string;
				detail?: string;
				tone: AppNotification["tone"];
				key?: string;
			}>,
		) {
			if (state.viewNotificationMuted && action.payload.tone !== "error")
				return;
			const current = action.payload.key
				? state.notifications.find((item) => item.key === action.payload.key)
				: undefined;
			if (current) {
				current.title = action.payload.title;
				current.detail = action.payload.detail;
				current.tone = action.payload.tone;
				current.at = Date.now();
				return;
			}
			state.notifications.unshift({
				id: `${Date.now()}-${state.notifications.length}`,
				at: Date.now(),
				read: false,
				title: action.payload.title,
				detail: action.payload.detail,
				tone: action.payload.tone,
				key: action.payload.key,
			});
			if (state.notifications.length > 30) state.notifications.pop();
		},
		dismissNotification(state, action: PayloadAction<string>) {
			state.notifications = state.notifications.filter(
				(item) => item.id !== action.payload,
			);
		},
		markNotificationsRead(state) {
			for (const item of state.notifications) item.read = true;
		},
		clearNotifications(state) {
			state.notifications = [];
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
		getDirectoryClipboard: (state) => state.directoryClipboard,
		getDirectorySelection: (state) => state.directorySelection,
		getNotifications: (state) => state.notifications,
	},
});

export const {
	update: actionInterfaceUpdate,
	openFile: actionInterfaceOpenFile,
	closeFile: actionInterfaceCloseFile,
	reorderFiles: actionInterfaceReorderFiles,
	setDirectoryClipboard: actionInterfaceSetDirectoryClipboard,
	setDirectorySelection: actionInterfaceSetDirectorySelection,
	pushNotification: actionInterfacePushNotification,
	dismissNotification: actionInterfaceDismissNotification,
	markNotificationsRead: actionInterfaceMarkNotificationsRead,
	clearNotifications: actionInterfaceClearNotifications,
} = interfaceSlice.actions;

export const {
	getIsReady: selectorInterfaceGetIsReady,
	getViewPanel: selectorInterfaceGetViewPanel,
	getViewNotificationMuted: selectorInterfaceGetViewNotificationMuted,
	getOpenFiles: selectorInterfaceGetOpenFiles,
	getActiveFile: selectorInterfaceGetActiveFile,
	getWorkspacePath: selectorInterfaceGetWorkspacePath,
	getDirectoryClipboard: selectorInterfaceGetDirectoryClipboard,
	getDirectorySelection: selectorInterfaceGetDirectorySelection,
	getNotifications: selectorInterfaceGetNotifications,
} = interfaceSlice.selectors;

export default interfaceSlice.reducer;

storageListener.startListening({
	effect: (_action, listenerApi) => {
		listenerApi.cancelActiveListeners();
		const state = listenerApi.getState() as { interface: InitialStateType };
		const hasWindow = Boolean(globalThis.window);
		const localStorage = hasWindow ? globalThis.localStorage : undefined;
		if (localStorage) {
			const current = state.interface;
			localStorage.setItem(
				LOCALSTORAGE_KEY,
				JSON.stringify({
					viewPanel: current.viewPanel,
					viewNotificationMuted: current.viewNotificationMuted,
					openFiles: current.openFiles,
					activeFile: current.activeFile,
					workspacePath: current.workspacePath,
				}),
			);
		}
	},
	matcher: isAnyOf(
		actionInterfaceUpdate,
		actionInterfaceOpenFile,
		actionInterfaceCloseFile,
		actionInterfaceReorderFiles,
	),
});
