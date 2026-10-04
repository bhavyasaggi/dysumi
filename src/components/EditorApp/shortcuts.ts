import { useEffect, useRef } from "react";
import { useReduxDispatch, useReduxSelector } from "@/lib/redux/hooks";
import { useOpenWebFsHandleMutation } from "@/lib/redux/queries/web-fs/meta";
import { useCreateWebFsFileMutation } from "@/lib/redux/queries/web-fs/modify";
import {
	actionInterfaceOpenFile,
	actionInterfacePushNotification,
	actionInterfaceUpdate,
	selectorInterfaceGetWorkspacePath,
} from "@/lib/redux/slices/interface";
import { validateDirectoryName } from "@/lib/workers/file-worker-fs";

type NoteDispatch = (
	action: ReturnType<typeof actionInterfacePushNotification>,
) => void;

function command(event: KeyboardEvent) {
	return event.ctrlKey || event.metaKey;
}

function parentPath(path: string, workspace?: string) {
	if (!path || path.includes(":")) return workspace ?? "";
	const parts = path.split("/");
	parts.pop();
	return parts.join("/") || workspace || "";
}

function fileName(path: string) {
	if (path.includes(":")) return "untitled.md";
	return path.split("/").pop() || "untitled.md";
}

function runShortcut(
	event: KeyboardEvent,
	actions: {
		createFile: () => Promise<void>;
		openFolder: () => Promise<void>;
		search: () => void;
		unsaved: () => void;
	},
) {
	if (!command(event) || event.altKey) return;
	const key = event.key.toLowerCase();
	if (key === "n" && !event.shiftKey) {
		event.preventDefault();
		actions.createFile().catch(() => undefined);
		return;
	}
	if (key === "o" && !event.shiftKey) {
		event.preventDefault();
		actions.openFolder().catch(() => undefined);
		return;
	}
	if (key === "f" && !event.shiftKey) {
		const target = event.target;
		if (
			target instanceof Element &&
			target.closest(
				"input, textarea, .monaco-editor, [contenteditable='true']",
			)
		) {
			return;
		}
		event.preventDefault();
		actions.search();
		return;
	}
	if (key === "s") {
		event.preventDefault();
		const marked = event as KeyboardEvent & { editorHandled?: boolean };
		if (!marked.editorHandled) actions.unsaved();
	}
}

export function askSaveAs(
	dispatch: NoteDispatch,
	options: { currentPath: string; workspace?: string },
) {
	const folder = parentPath(options.currentPath, options.workspace);
	if (!folder) {
		dispatch(
			actionInterfacePushNotification({
				tone: "info",
				title: "Open a folder before saving a copy",
			}),
		);
		return null;
	}
	const value = window.prompt("Save as", fileName(options.currentPath));
	if (value == null) return null;
	const name = value.trim();
	const check = validateDirectoryName(name);
	if (!check.isValid) {
		dispatch(
			actionInterfacePushNotification({
				tone: "error",
				title: check.error ?? "Invalid name",
			}),
		);
		return null;
	}
	return { name, path: `${folder}/${name}` };
}

export function saveDetail(error: unknown) {
	if (error instanceof Error && error.message) return error.message;
	if (
		error &&
		typeof error === "object" &&
		"error" in error &&
		typeof error.error === "string"
	) {
		return error.error;
	}
	return "Could not save";
}

export function useFileSaveKeys(handlers: {
	save: () => Promise<void>;
	saveAs: () => Promise<void>;
}) {
	const handlersRef = useRef(handlers);
	handlersRef.current = handlers;
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (!command(event) || event.altKey) return;
			if (event.key.toLowerCase() !== "s") return;
			(event as KeyboardEvent & { editorHandled?: boolean }).editorHandled =
				true;
			event.preventDefault();
			const run = event.shiftKey
				? handlersRef.current.saveAs
				: handlersRef.current.save;
			run().catch(() => undefined);
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, []);
}

export function useEditorShortcuts() {
	const dispatch = useReduxDispatch();
	const workspace = useReduxSelector(selectorInterfaceGetWorkspacePath);
	const [createFile] = useCreateWebFsFileMutation();
	const [openFolder] = useOpenWebFsHandleMutation();

	useEffect(() => {
		const createInWorkspace = async () => {
			if (!workspace) {
				dispatch(
					actionInterfacePushNotification({
						tone: "info",
						title: "Open a folder, then choose New File",
					}),
				);
				return;
			}
			const value = window.prompt("New file name", "untitled.md");
			if (value == null) return;
			const name = value.trim();
			const check = validateDirectoryName(name);
			if (!check.isValid) {
				dispatch(
					actionInterfacePushNotification({
						tone: "error",
						title: check.error ?? "Invalid name",
					}),
				);
				return;
			}
			const path = `${workspace}/${name}`;
			try {
				await createFile({ path, options: { force: true } }).unwrap();
				dispatch(actionInterfaceOpenFile({ name, path }));
				dispatch(
					actionInterfacePushNotification({
						tone: "success",
						title: `Created ${name}`,
					}),
				);
			} catch (error) {
				dispatch(
					actionInterfacePushNotification({
						tone: "error",
						title: `Could not create ${name}`,
						detail:
							error instanceof Error ? error.message : "The file action failed",
					}),
				);
			}
		};

		const chooseFolder = async () => {
			try {
				const data = await openFolder("directory").unwrap();
				dispatch(
					actionInterfaceUpdate({
						viewPanel: "explorer",
						workspacePath: data.fullPath,
					}),
				);
			} catch (error) {
				const detail = error instanceof Error ? error.message : String(error);
				if (/abort/i.test(detail)) return;
				dispatch(
					actionInterfacePushNotification({
						tone: "error",
						title: "Could not open a folder",
						detail,
					}),
				);
			}
		};

		const onKey = (event: KeyboardEvent) => {
			runShortcut(event, {
				createFile: createInWorkspace,
				openFolder: chooseFolder,
				search: () => {
					dispatch(actionInterfaceUpdate({ viewPanel: "search" }));
					const focusSearch = () => {
						document
							.querySelector<HTMLInputElement>(
								'input[aria-label="Search file names"]',
							)
							?.focus();
					};
					focusSearch();
					requestAnimationFrame(focusSearch);
				},
				unsaved: () => {
					dispatch(
						actionInterfacePushNotification({
							tone: "info",
							title: "Nothing to save",
						}),
					);
				},
			});
		};

		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [createFile, dispatch, openFolder, workspace]);
}
