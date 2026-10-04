import {
	CreateWebWorkerMLCEngine,
	type InitProgressReport,
	type MLCEngineInterface,
} from "@mlc-ai/web-llm";

export type ChatTurn = {
	role: "system" | "user" | "assistant";
	content: string;
};

let engine: MLCEngineInterface | null = null;
let loadedId = "";
let chain: Promise<unknown> = Promise.resolve();

export function loadedModelId() {
	return loadedId;
}

function createWorker() {
	return new Worker(new URL("./worker.ts", import.meta.url), {
		type: "module",
	});
}

export function ensureModel(
	modelId: string,
	options?: { onProgress?: (report: InitProgressReport) => void },
) {
	const run = chain.then(async () => {
		const onProgress = (report: InitProgressReport) => {
			options?.onProgress?.(report);
		};
		if (engine && loadedId === modelId) {
			onProgress({ progress: 1, timeElapsed: 0, text: "" });
			return;
		}
		if (engine) {
			engine.setInitProgressCallback(onProgress);
			await engine.reload(modelId);
		} else {
			engine = await CreateWebWorkerMLCEngine(createWorker(), modelId, {
				initProgressCallback: onProgress,
			});
		}
		loadedId = modelId;
	});
	chain = run.then(
		() => undefined,
		() => undefined,
	);
	return run;
}

export async function streamReply(
	messages: ChatTurn[],
	options: { onDelta: (text: string) => void },
) {
	if (!engine) throw new Error("Load a model before sending a message");
	await engine.resetChat();
	const chunks = await engine.chat.completions.create({
		messages,
		stream: true,
		temperature: 0.7,
	});
	let reply = "";
	for await (const chunk of chunks) {
		const delta = chunk.choices[0]?.delta.content ?? "";
		if (!delta) continue;
		reply += delta;
		options.onDelta(reply);
	}
	return reply;
}
