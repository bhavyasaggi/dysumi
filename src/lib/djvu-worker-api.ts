import * as Comlink from "comlink";
import type { DjvuWorker } from "@/lib/workers/djvu-worker";

let worker: Comlink.Remote<DjvuWorker> | null = null;

export function getDjvuWorkerApi() {
	if (!worker) {
		const next = new Worker(new URL("./workers/djvu-worker", import.meta.url), {
			type: "module",
		});
		worker = Comlink.wrap<DjvuWorker>(next);
	}
	return worker;
}
