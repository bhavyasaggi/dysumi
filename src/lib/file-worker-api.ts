import * as Comlink from "comlink";
import type {
	FileProcessor,
	FileProcessorEntry,
} from "@/lib/workers/file-worker.d";

export type { FileProcessor, FileProcessorEntry };

let fileWorker: Comlink.Remote<FileProcessor> | null = null;

export async function getFileWorkerApi() {
	if (!fileWorker) {
		const worker = new Worker(
			new URL("./workers/file-worker", import.meta.url),
			{ type: "module" },
		);
		fileWorker = Comlink.wrap<FileProcessor>(worker);
	}
	return fileWorker;
}
