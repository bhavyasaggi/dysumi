declare global {
  interface FileSystemHandle {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
    getFileHandle(
      name: string,
      options?: { create?: boolean },
    ): Promise<FileSystemFileHandle>;
    getDirectoryHandle(
      name: string,
      options?: { create?: boolean },
    ): Promise<FileSystemDirectoryHandle>;
    queryPermission(
      options?: { mode?: "read" | "readwrite" },
    ): Promise<"granted" | "denied" | "prompt">;
    requestPermission(
      options?: { mode?: "read" | "readwrite" },
    ): Promise<"granted" | "denied">;
    move(newName: string): Promise<void>;
    move(
      destinationDirectory: FileSystemDirectoryHandle,
      newName?: string,
    ): Promise<void>;
  }
}

// Module declarations for style imports
declare module "*.module.scss" {
  const classes: { [key: string]: string };
  export default classes;
}

// Vite URL imports
declare module "*?url" {
  const url: string;
  export default url;
}

declare module "*?worker" {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

export {};
