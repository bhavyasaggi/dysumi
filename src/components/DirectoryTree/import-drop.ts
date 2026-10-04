type DropItem = DataTransferItem & {
	getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
};

type ImportWriter = {
	createFile: (path: string) => Promise<unknown>;
	createDirectory: (path: string) => Promise<unknown>;
	writeBinary: (path: string, content: Uint8Array) => Promise<unknown>;
};

function hasFiles(transfer: DataTransfer) {
	return [...transfer.types].includes("Files");
}

async function importHandle(
	handle: FileSystemHandle,
	directory: string,
	writer: ImportWriter,
) {
	const path = `${directory}/${handle.name}`;
	if (handle.kind === "file") {
		const file = await (handle as FileSystemFileHandle).getFile();
		await writer.createFile(path);
		await writer.writeBinary(path, new Uint8Array(await file.arrayBuffer()));
		return 1;
	}
	await writer.createDirectory(path);
	let count = 0;
	const entries = (
		handle as FileSystemDirectoryHandle & {
			entries: () => AsyncIterable<[string, FileSystemHandle]>;
		}
	).entries();
	for await (const [, child] of entries) {
		count += await importHandle(child, path, writer);
	}
	return count;
}

export async function importDataTransfer(
	items: DataTransferItemList,
	directory: string,
	writer: ImportWriter,
) {
	let count = 0;
	for (const item of items) {
		if (item.kind !== "file") continue;
		const handle = await (item as DropItem).getAsFileSystemHandle?.();
		if (handle) {
			count += await importHandle(handle, directory, writer);
			continue;
		}
		const file = item.getAsFile();
		if (!file) continue;
		const path = `${directory}/${file.name}`;
		await writer.createFile(path);
		await writer.writeBinary(path, new Uint8Array(await file.arrayBuffer()));
		count += 1;
	}
	return count;
}

export function acceptsFileDrop(transfer: DataTransfer) {
	return hasFiles(transfer);
}
