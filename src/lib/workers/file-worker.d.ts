type FileProcessorEntry = {
	name: string;
	fullPath: string;
	isDirectory: boolean;
	isFile: boolean;
	isDirty?: boolean;
	mimetype?: string;
	size?: number;
	lastModified?: number;
};

export interface FileProcessor {
	_idbInstanceCache?: Promise<IDBPDatabase<unknown>>;
	getIDB(): Promise<IDBPDatabase<unknown>>;
	getHandle(
		path: string,
		options?: { type?: "opfs"; mode?: "read" | "readwrite" },
	): Promise<FileSystemHandle>;
	listHandleKeys(): Promise<string[]>;
	/**
	 * Sets FS handle to idb
	 */
	open(handle: FileSystemHandle): Promise<FileProcessorEntry>;
	/**
	 * Writes to OPFS
	 */
	edit(path: string, content: string): Promise<{ success: boolean }>;
	/**
	 * Copies OPFS to FS
	 */
	save(
		sourcePath: string,
		options?: { targetPath?: string },
	): Promise<{ success: boolean }>;
	/**
	 * Deletes from OPFS
	 */
	close(path?: string): Promise<{ success: boolean }>;
	/**
	 * Reads from FS
	 */
	meta(path: string): Promise<FileProcessorEntry | undefined>;
	/**
	 * Enumerates from FS
	 */
	list(path: string): Promise<FileProcessorEntry[]>;
	/**
	 * Reads from OPFS if present, else reads from FS
	 */
	read(
		path: string,
	): Promise<(FileProcessorEntry & { content: string }) | undefined>; // read stream instead of string?
	/**
	 * Writes to FS
	 */
	write(path: string, content: string): Promise<{ success: boolean }>;
	/**
	 * Deletes from OPFS & FS
	 */
	remove(path: string): Promise<{ success: boolean }>;
	createFile(
		path: string,
		options?: { force?: boolean },
	): Promise<{ success: boolean }>;
	createDirectory(
		path: string,
		options?: { force?: boolean },
	): Promise<{ success: boolean }>;
	/**
	 * @abstract Unimplemented
	 */
	move(
		sourcePath: string,
		targetPath: string,
		options?: { force?: boolean },
	): Promise<{ success: boolean }>;
	copy(
		sourcePath: string,
		targetPath: string,
		options?: { force?: boolean },
	): Promise<{ success: boolean }>;
}
