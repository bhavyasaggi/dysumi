export const DRAFT_NAME = "draft-store";

export const pathToSegments = (path: string) =>
	String(path || "")
		.replaceAll(/((?:^\/)|(?:\/$))/gm, "")
		.split("/");

export const validateDirectoryName = (
	name: string,
): { isValid: boolean; error?: string } => {
	if (typeof name !== "string") {
		return { isValid: false, error: "Name must be a string" };
	}
	if (
		!name ||
		name.length === 0 ||
		name.length > 255 ||
		name === "." ||
		name === ".."
	) {
		return {
			isValid: false,
			error: "Name must be between 1 and 255 characters",
		};
	}
	// biome-ignore lint/suspicious/noControlCharactersInRegex: SAFE CHARS
	const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
	if (invalidChars.test(name)) {
		return { isValid: false, error: "Name contains invalid characters" };
	}
	const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
	if (reservedNames.test(name)) {
		return { isValid: false, error: "Name is reserved" };
	}
	if (name.startsWith(".") || name.endsWith(".")) {
		return { isValid: false, error: "Name cannot start or end with a dot" };
	}
	return { isValid: true };
};

export const fileLocks = new Map<
	string,
	{ promise: Promise<unknown>; timestamp: number }
>();

export async function renameEntry(
	path: string,
	newName: string,
	options: {
		getHandle: (
			entryPath: string,
			handleOptions?: { mode?: "read" | "readwrite" },
		) => Promise<FileSystemHandle>;
	},
) {
	const { isValid, error } = validateDirectoryName(newName);
	if (!isValid) {
		throw new Error(error ?? "Invalid name");
	}
	const handle = await options.getHandle(path, { mode: "readwrite" });
	const movable = handle as FileSystemHandle & {
		move?: (name: string) => Promise<void>;
	};
	if (typeof movable.move !== "function") {
		throw new Error("Rename is not supported in this browser");
	}
	await movable.move(newName);
	return { success: true as const };
}

export const withFileLock = async <T>(
	fileName: string,
	operation: () => Promise<T>,
): Promise<T> => {
	if (fileLocks.has(fileName)) {
		throw new Error(`File lock already acquired for ${fileName}`);
	}
	const lockPromise = operation();
	fileLocks.set(fileName, { promise: lockPromise, timestamp: Date.now() });
	try {
		const result = await lockPromise;
		return result;
	} finally {
		const current = fileLocks.get(fileName);
		if (current?.promise === lockPromise) {
			fileLocks.delete(fileName);
		}
	}
};

/**
 * Get only immediate Handle
 */
export async function getFileSystemHandle(
	handle: FileSystemDirectoryHandle,
	path: string,
): Promise<FileSystemHandle> {
	let localHandle: FileSystemHandle | undefined;
	try {
		localHandle = await handle.getDirectoryHandle(path);
	} catch {
		// Gulp
	}
	try {
		if (!localHandle) {
			localHandle = await handle.getFileHandle(path);
		}
	} catch {
		// Gulp
	}
	if (!localHandle) {
		throw new Error("Invalid path");
	}
	return localHandle;
}

export async function* streamToAsyncIterator(
	reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>,
) {
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		yield value;
	}
}

function suffixedName(name: string, kind: FileSystemHandle["kind"]) {
	const token = Math.random().toString(36).slice(2, 9);
	if (kind === "directory" || !name.includes(".")) return `${name}-${token}`;
	const parts = name.split(".");
	const extension = parts.pop();
	return `${parts.join(".")}-${token}.${extension}`;
}

async function availableName(
	parent: FileSystemDirectoryHandle,
	options: { name: string; kind: FileSystemHandle["kind"] },
) {
	try {
		if (options.kind === "file") await parent.getFileHandle(options.name);
		else await parent.getDirectoryHandle(options.name);
		return suffixedName(options.name, options.kind);
	} catch {
		return options.name;
	}
}

async function writeFileCopy(
	source: FileSystemFileHandle,
	parent: FileSystemDirectoryHandle,
	name: string,
) {
	const file = await source.getFile();
	const handle = await parent.getFileHandle(name, { create: true });
	const writable = await handle.createWritable();
	const reader = streamToAsyncIterator(
		file.stream().getReader() as ReadableStreamDefaultReader<
			Uint8Array<ArrayBuffer>
		>,
	);
	const writer = writable.getWriter();
	for await (const chunk of reader) {
		await writer.write(chunk);
	}
	await writer.close();
}

async function copyDirectoryChildren(
	source: FileSystemDirectoryHandle,
	destination: FileSystemDirectoryHandle,
) {
	const entries = (
		source as FileSystemDirectoryHandle & {
			entries: () => AsyncIterable<[string, FileSystemHandle]>;
		}
	).entries();
	for await (const [name, handle] of entries) {
		if (handle.kind === "directory") {
			const next = await destination.getDirectoryHandle(name, { create: true });
			await copyDirectoryChildren(handle as FileSystemDirectoryHandle, next);
			continue;
		}
		if (handle.kind === "file") {
			await writeFileCopy(handle as FileSystemFileHandle, destination, name);
		}
	}
}

export async function copyEntryTree(
	sourcePath: string,
	targetPath: string,
	options: {
		getHandle: (
			entryPath: string,
			handleOptions?: { mode?: "read" | "readwrite" },
		) => Promise<FileSystemHandle>;
	},
) {
	const sourceHandle = await options.getHandle(sourcePath, { mode: "read" });
	const segments = pathToSegments(targetPath);
	const requestedName = segments.pop() || "";
	const parentPath = segments.join("/");
	const parentHandle = await options.getHandle(parentPath, {
		mode: "readwrite",
	});
	if (!(parentHandle instanceof FileSystemDirectoryHandle)) {
		throw new Error("Can not copy to a file.");
	}
	const targetName = await availableName(parentHandle, {
		name: requestedName,
		kind: sourceHandle.kind,
	});
	const path = parentPath ? `${parentPath}/${targetName}` : targetName;
	if (sourceHandle instanceof FileSystemDirectoryHandle) {
		const destination = await parentHandle.getDirectoryHandle(targetName, {
			create: true,
		});
		await copyDirectoryChildren(sourceHandle, destination);
		return { success: true as const, path };
	}
	if (!(sourceHandle instanceof FileSystemFileHandle)) {
		throw new Error("Can not copy to a file.");
	}
	await writeFileCopy(sourceHandle, parentHandle, targetName);
	return { success: true as const, path };
}

type WalkNode = {
	kind: string;
	entries?: () => AsyncIterable<[string, WalkNode]>;
};

function comparePath(left: string, right: string) {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

// Yield so reads and writes on this worker can run during a large walk.
function yieldToWorker() {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

export async function collectFileNames(
	root: WalkNode,
	options: { isCurrent: () => boolean },
) {
	if (root.kind !== "directory" || !root.entries) {
		throw new Error("Unable to list a file");
	}
	const names: string[] = [];
	const queue: Array<{ node: WalkNode; prefix: string } | undefined> = [
		{ node: root, prefix: "" },
	];
	let cursor = 0;
	let seen = 0;
	while (cursor < queue.length) {
		const current = queue[cursor];
		queue[cursor] = undefined;
		cursor += 1;
		if (!current?.node.entries) continue;
		if (!options.isCurrent()) throw new Error("Name walk stopped");
		for await (const [name, handle] of current.node.entries()) {
			const relative = current.prefix ? `${current.prefix}/${name}` : name;
			if (handle.kind === "directory") {
				queue.push({ node: handle, prefix: relative });
			} else if (handle.kind === "file") {
				names.push(relative);
			}
			seen += 1;
			if (seen % 100 === 0) {
				await yieldToWorker();
				if (!options.isCurrent()) throw new Error("Name walk stopped");
			}
		}
	}
	names.sort(comparePath);
	return names;
}
