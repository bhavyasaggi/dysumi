import * as Comlink from "comlink";
import { type IDBPDatabase, openDB } from "idb";

import type { FileProcessor, FileProcessorEntry } from "./file-worker.d";

const DB_NAME = "web-db";
const STORE_NAME = "handles-store"; // used by idb

import {
	collectFileNames,
	copyEntryTree,
	DRAFT_NAME,
	getFileSystemHandle,
	pathToSegments,
	renameEntry,
	streamToAsyncIterator,
	validateDirectoryName,
	withFileLock,
} from "./file-worker-fs";

let namesWalk = 0;

const fileProcessor: FileProcessor = {
	_idbInstanceCache: undefined as Promise<IDBPDatabase<unknown>> | undefined,
	getIDB() {
		this._idbInstanceCache ??= openDB(DB_NAME, 1, {
			upgrade(db) {
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME);
				}
			},
		});
		return this._idbInstanceCache;
	},
	// --
	async getHandle(path, options) {
		const [rootPath, ...pathArray] = pathToSegments(path);
		if (!rootPath) {
			throw new Error("Root path is required");
		}

		let rootHandle: FileSystemHandle | undefined;
		if (options?.type === "opfs") {
			const opfsDir = await navigator.storage.getDirectory();
			rootHandle = await opfsDir.getDirectoryHandle(DRAFT_NAME, {
				create: true,
			});
			rootHandle = await getFileSystemHandle(
				rootHandle as FileSystemDirectoryHandle,
				rootPath,
			);
		} else {
			const db = await this.getIDB();
			rootHandle = await db.get(STORE_NAME, rootPath);
		}

		if (!rootHandle) {
			throw new Error("Root handle not found");
		}

		let currentHandle = rootHandle;
		for await (const segment of pathArray) {
			if (!(currentHandle instanceof FileSystemDirectoryHandle)) {
				throw new Error("Invalid path");
			}
			currentHandle = await getFileSystemHandle(currentHandle, segment);
		}

		if (options?.mode) {
			const permission: "granted" | "denied" | "prompt" =
				await // biome-ignore lint/suspicious/noExplicitAny: Unable to declare
				(currentHandle as any).queryPermission({ mode: options.mode });
			if (permission !== "granted") {
				throw new Error("Permission denied");
			}
		}

		return currentHandle;
	},
	async listHandleKeys() {
		const db = await this.getIDB();
		const handleKeys = (await db.getAllKeys(STORE_NAME)) as
			| string[]
			| undefined;
		return handleKeys ?? [];
	},
	// ---
	async open(handle) {
		const db = await this.getIDB();
		await db.put(STORE_NAME, handle, handle?.name || "untitled");
		// CLEAR out OPFS
		const opfsHandle = await navigator.storage.getDirectory();
		await opfsHandle.removeEntry(DRAFT_NAME);
		return {
			name: handle?.name || "untitled",
			fullPath: handle?.name || "untitled",
			isDirectory: handle?.kind === "directory",
			isFile: handle?.kind === "file",
		};
	},
	edit(path, content) {
		return withFileLock(path, async () => {
			const pathSegments = pathToSegments(path);
			const pathName = pathSegments.pop() || "";

			let opfsHandle: FileSystemHandle = await navigator.storage.getDirectory();
			opfsHandle = await (
				opfsHandle as FileSystemDirectoryHandle
			).getDirectoryHandle(DRAFT_NAME, {
				create: true,
			});
			for await (const segment of pathSegments) {
				opfsHandle = await (
					opfsHandle as FileSystemDirectoryHandle
				).getDirectoryHandle(segment, {
					create: true,
				});
			}
			opfsHandle = await (
				opfsHandle as FileSystemDirectoryHandle
			).getFileHandle(pathName, {
				create: true,
			});

			const writable = await (
				opfsHandle as FileSystemFileHandle
			).createWritable();
			await writable.write(content);
			await writable.close();

			return { success: true };
		});
	},
	editBinary(path, content) {
		return withFileLock(path, async () => {
			const pathSegments = pathToSegments(path);
			const pathName = pathSegments.pop() || "";

			let opfsHandle: FileSystemHandle = await navigator.storage.getDirectory();
			opfsHandle = await (
				opfsHandle as FileSystemDirectoryHandle
			).getDirectoryHandle(DRAFT_NAME, {
				create: true,
			});
			for await (const segment of pathSegments) {
				opfsHandle = await (
					opfsHandle as FileSystemDirectoryHandle
				).getDirectoryHandle(segment, {
					create: true,
				});
			}
			opfsHandle = await (
				opfsHandle as FileSystemDirectoryHandle
			).getFileHandle(pathName, {
				create: true,
			});

			const writable = await (
				opfsHandle as FileSystemFileHandle
			).createWritable();
			await writable.write(content);
			await writable.close();

			return { success: true };
		});
	},
	save(sourcePath, options) {
		return withFileLock(sourcePath, async () => {
			const { targetPath } = options || {};

			const finalPath = targetPath || sourcePath;
			if (finalPath) {
				const { isValid, error } = validateDirectoryName(finalPath);
				if (!isValid) {
					throw new Error(error ?? "Invalid target path");
				}
			}

			const sourceHandle = await this.getHandle(sourcePath, {
				mode: "readwrite",
				type: "opfs",
			});
			if (!(sourceHandle instanceof FileSystemFileHandle)) {
				throw new Error("Unable to save");
			}

			const finalHandle = await this.getHandle(finalPath, {
				mode: "readwrite",
			});
			if (!(finalHandle instanceof FileSystemFileHandle)) {
				throw new Error("Invalid target path");
			}

			const sourceHandleFile = await sourceHandle.getFile();
			const finalHandleWritable = await finalHandle.createWritable();

			const reader = streamToAsyncIterator(
				sourceHandleFile.stream().getReader(),
			); // Get a reader from the source file's stream
			const writer = finalHandleWritable.getWriter(); // Get a writer for the destination stream

			for await (const chunk of reader) {
				await writer.write(chunk);
			}
			await writer.close();

			return { success: true };
		});
	},
	async close(path) {
		if (!path) {
			const opfsHandle = await navigator.storage.getDirectory();
			await opfsHandle.removeEntry(DRAFT_NAME, { recursive: true });
			return { success: true };
		}
		return withFileLock(path, async () => {
			const pathParts = String(path).split("/");
			const name = pathParts.pop() || "";
			const parentPath = pathParts.join("/") || "/";
			const parentHandle = await this.getHandle(parentPath, {
				type: "opfs",
			});
			await (parentHandle as FileSystemDirectoryHandle).removeEntry(name);

			return { success: true };
		});
	},
	// ---
	async meta(path) {
		const [opfsHandle, handle] = await Promise.all([
			this.getHandle(path, { mode: "read", type: "opfs" }).catch(() => {
				/* GULP */
			}),
			this.getHandle(path, { mode: "read" }),
		]);

		const returnValue: FileProcessorEntry = {
			name: handle.name || "",
			fullPath: path || "",
			isDirectory: handle.kind === "directory",
			isFile: handle.kind === "file",
			isDirty: Boolean(opfsHandle),
		};

		if (handle instanceof FileSystemFileHandle) {
			const file = await handle.getFile();
			returnValue.mimetype = file.type;
			returnValue.size = file.size;
			returnValue.lastModified = file.lastModified;
		}

		return returnValue;
	},
	listNames(path) {
		const token = ++namesWalk;
		return this.getHandle(path, { mode: "read" }).then((handle) =>
			collectFileNames(handle, { isCurrent: () => namesWalk === token }),
		);
	},
	async list(path) {
		const handle = await this.getHandle(path, { mode: "read" });
		if (!(handle instanceof FileSystemDirectoryHandle)) {
			throw new Error("Unable to list a file");
		}

		const entries: FileProcessorEntry[] = [];
		// biome-ignore lint/suspicious/noExplicitAny: Unable to declare
		for await (const entryArray of (handle as any).entries()) {
			const [handleName, handleEntry] = entryArray as [
				string,
				FileSystemHandle,
			];
			entries.push({
				name: handleName,
				fullPath: `${path}/${handleName}`,
				isDirectory: handleEntry.kind === "directory",
				isFile: handleEntry.kind === "file",
			});
		}

		return entries.sort((a, b) => {
			if (a.isDirectory && !b.isDirectory) {
				return -1;
			}
			if (!a.isDirectory && b.isDirectory) {
				return 1;
			}
			return a.name.localeCompare(b.name);
		});
	},
	async read(path) {
		const [opfsHandle, handle] = await Promise.all([
			this.getHandle(path, { mode: "read", type: "opfs" }).catch(() => {
				/* GULP */
			}),
			this.getHandle(path, { mode: "read" }),
		]);
		if (!(handle instanceof FileSystemFileHandle)) {
			throw new Error("Cannot read a directory");
		}

		const meta: FileProcessorEntry & { content: string } = {
			name: handle.name,
			fullPath: path,
			isDirectory: (handle.kind as string) === "directory",
			isFile: handle.kind === "file",
			content: "",
		};
		if (opfsHandle && opfsHandle instanceof FileSystemFileHandle) {
			const file = await opfsHandle.getFile();
			meta.content = await file.text();
			meta.isDirty = true;
			meta.name = file.name;
			meta.size = file.size;
			meta.lastModified = file.lastModified;
		} else {
			const file = await handle.getFile();
			meta.content = await file.text();
			meta.name = file.name;
			meta.size = file.size;
			meta.lastModified = file.lastModified;
		}

		return meta;
	},
	async readBinary(path) {
		const [opfsHandle, handle] = await Promise.all([
			this.getHandle(path, { mode: "read", type: "opfs" }).catch(() => {
				/* GULP */
			}),
			this.getHandle(path, { mode: "read" }),
		]);
		if (!(handle instanceof FileSystemFileHandle)) {
			throw new Error("Cannot read a directory");
		}

		const meta: FileProcessorEntry & { content: ArrayBuffer } = {
			name: handle.name,
			fullPath: path,
			isDirectory: (handle.kind as string) === "directory",
			isFile: handle.kind === "file",
			content: new ArrayBuffer(0),
		};
		if (opfsHandle && opfsHandle instanceof FileSystemFileHandle) {
			const file = await opfsHandle.getFile();
			meta.content = await file.arrayBuffer();
			meta.isDirty = true;
			meta.name = file.name;
			meta.size = file.size;
			meta.lastModified = file.lastModified;
		} else {
			const file = await handle.getFile();
			meta.content = await file.arrayBuffer();
			meta.name = file.name;
			meta.size = file.size;
			meta.lastModified = file.lastModified;
		}

		return meta;
	},
	write(path, content) {
		return withFileLock(path, async () => {
			const handle = await this.getHandle(path, { mode: "readwrite" });
			if (!(handle instanceof FileSystemFileHandle)) {
				throw new Error("Cannot write to a directory");
			}

			const writable = await handle.createWritable();
			await writable.write(content);
			await writable.close();

			return { success: true };
		});
	},
	writeBinary(path, content) {
		return withFileLock(path, async () => {
			const handle = await this.getHandle(path, { mode: "readwrite" });
			if (!(handle instanceof FileSystemFileHandle)) {
				throw new Error("Cannot write to a directory");
			}

			const writable = await handle.createWritable();
			await writable.write(content);
			await writable.close();

			return { success: true };
		});
	},
	remove(path) {
		return withFileLock(path, async () => {
			const pathParts = path.split("/");
			const name = pathParts.pop() || "";
			const parentPath = pathParts.join("/") || "/";

			const handle = await this.getHandle(parentPath, { mode: "readwrite" });
			if (!(handle instanceof FileSystemDirectoryHandle)) {
				throw new Error("Cannot delete from a file");
			}

			await handle.removeEntry(name, { recursive: true });

			return { success: true };
		});
	},
	createFile(path, options) {
		return withFileLock(path, async () => {
			const pathParts = path.split("/");
			const name = pathParts.pop() || "";
			const parentPath = pathParts.join("/") || "/";

			const { isValid, error } = validateDirectoryName(name);
			if (!isValid) {
				throw new Error(error ?? "Invalid file name");
			}

			const handle = await this.getHandle(parentPath, { mode: "readwrite" });
			if (!(handle instanceof FileSystemDirectoryHandle)) {
				throw new Error("Cannot create file in a file");
			}

			await handle.getFileHandle(name, { create: options?.force });
			return { success: true };
		});
	},
	createDirectory(path, options) {
		return withFileLock(path, async () => {
			const pathParts = path.split("/");
			const name = pathParts.pop() || "";
			const parentPath = pathParts.join("/") || "/";

			const { isValid, error } = validateDirectoryName(name);
			if (!isValid) {
				throw new Error(error ?? "Invalid directory name");
			}

			const handle = await this.getHandle(parentPath, { mode: "readwrite" });
			if (!(handle instanceof FileSystemDirectoryHandle)) {
				throw new Error("Cannot create directory in a file");
			}

			await handle.getDirectoryHandle(name, { create: options?.force });
			return { success: true };
		});
	},
	rename(path, newName) {
		return renameEntry(path, newName, {
			getHandle: (entryPath, handleOptions) =>
				this.getHandle(entryPath, handleOptions),
		});
	},
	copy(sourcePath, targetPath) {
		return withFileLock(targetPath, () =>
			copyEntryTree(sourcePath, targetPath, {
				getHandle: (entryPath, handleOptions) =>
					this.getHandle(entryPath, handleOptions),
			}),
		);
	},
};

Comlink.expose(fileProcessor);
