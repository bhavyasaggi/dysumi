import * as Comlink from "comlink";
import init, { WasmDocument } from "djvu-rs";

export interface DjvuPageWire {
	width: number;
	height: number;
	pixels: Uint8Array;
	text: string;
	count: number;
	index: number;
}

let ready: Promise<unknown> | null = null;
let document: WasmDocument | null = null;
let generation = 0;

function ensureWasm() {
	ready ??= init();
	return ready;
}

const api = {
	async open(bytes: Uint8Array) {
		await ensureWasm();
		document?.free();
		generation += 1;
		document = WasmDocument.from_bytes(bytes);
		return { generation, count: document.page_count() };
	},
	page(request: { generation: number; index: number }) {
		if (!document || request.generation !== generation) {
			throw new Error("This DjVu document is no longer open");
		}
		const count = document.page_count();
		const index = Math.min(Math.max(request.index, 0), Math.max(count - 1, 0));
		const leaf = document.page(index);
		const dpi = Math.min(leaf.dpi() || 96, 110);
		const rendered = leaf.render(dpi);
		const pixels = new Uint8Array(rendered.length);
		pixels.set(rendered);
		const page = {
			width: leaf.width_at(dpi),
			height: leaf.height_at(dpi),
			pixels,
			text: leaf.text() ?? "",
			count,
			index,
		};
		leaf.free();
		return page;
	},
	close(current: number) {
		if (current !== generation) return;
		document?.free();
		document = null;
		generation += 1;
	},
};

export type DjvuWorker = typeof api;

Comlink.expose(api);
