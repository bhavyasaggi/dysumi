import * as Comlink from "comlink";
import type { ParseWorker } from "@/lib/workers/parse-worker";

let parseWorker: Comlink.Remote<ParseWorker> | null = null;

export function getParseWorkerApi() {
	if (!parseWorker) {
		const worker = new Worker(
			new URL("./workers/parse-worker", import.meta.url),
			{ type: "module" },
		);
		parseWorker = Comlink.wrap<ParseWorker>(worker);
	}
	return parseWorker;
}
