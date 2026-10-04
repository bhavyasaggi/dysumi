import { openDB } from "idb";
import { indexMailbox } from "./index-mailbox";
import { type ParsedEmail, textToEmail } from "./text-to-email";
import type { MailSummary } from "./types";

export type { MailSummary, ParsedEmail };

export enum BrowserMBoxEvent {
	PROGRESS = "progress",
	READY = "ready",
}

const STORE_NAME = "messages";

/**
 * Index an mbox or eml into IndexedDB, then page through the headers.
 * Message bodies stay in the source text and are parsed when opened.
 * Each instance uses its own database so two viewers cannot clear each other.
 */
export class BrowserMBox {
	private readonly eventTarget = new EventTarget();
	private readonly dbName = `dysumi-mbox-${crypto.randomUUID()}`;
	private text = "";
	private generation = 0;

	public addEventListener(
		type: BrowserMBoxEvent,
		listener: (event: CustomEvent<number>) => void,
	) {
		this.eventTarget.addEventListener(type, listener as EventListener);
	}

	public removeEventListener(
		type: BrowserMBoxEvent,
		listener: (event: CustomEvent<number>) => void,
	) {
		this.eventTarget.removeEventListener(type, listener as EventListener);
	}

	public async open(options: {
		text: string;
		single?: boolean;
		chunkSize?: number;
		maxChunkSize?: number;
	}) {
		const generation = ++this.generation;
		this.text = options.text;
		this.emit(0);
		const messages = await indexMailbox(options.text, {
			chunkSize: options.chunkSize,
			maxChunkSize: options.maxChunkSize,
			onProgress: (progress) => {
				if (generation === this.generation) this.emit(Math.min(progress, 99));
			},
			single: options.single,
		});
		if (generation !== this.generation) return this;

		const database = await openDB(this.dbName, 1, {
			upgrade(db) {
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME, { autoIncrement: true });
				}
			},
		});
		await database.clear(STORE_NAME);
		for (const message of messages) {
			if (generation !== this.generation) break;
			const id = await database.add(STORE_NAME, message);
			await database.put(STORE_NAME, { ...message, id }, id);
		}
		database.close();
		if (generation === this.generation) this.emit(100);
		return this;
	}

	public async count(): Promise<number> {
		const database = await openDB(this.dbName, 1);
		const total = await database.count(STORE_NAME);
		database.close();
		return total;
	}

	public async list(start: number, count: number): Promise<MailSummary[]> {
		const database = await openDB(this.dbName, 1);
		const transaction = database.transaction(STORE_NAME, "readonly");
		let hasSkipped = false;
		const rows: MailSummary[] = [];
		for await (const cursor of transaction.store) {
			if (!hasSkipped && start > 0) {
				hasSkipped = true;
				cursor.advance(start);
				continue;
			}
			rows.push(cursor.value as MailSummary);
			if (rows.length < count) cursor.continue();
			else break;
		}
		database.close();
		return rows;
	}

	public async get(key: number): Promise<ParsedEmail | undefined> {
		const database = await openDB(this.dbName, 1);
		const result = (await database.get(STORE_NAME, key)) as
			| MailSummary
			| undefined;
		database.close();
		if (!result) return undefined;
		const raw = this.text.slice(
			result.offset,
			result.offset + result.offsetLength,
		);
		return textToEmail(raw, result.offset);
	}

	public destroy() {
		this.generation += 1;
		indexedDB.deleteDatabase(this.dbName);
	}

	private emit(progress: number) {
		this.eventTarget.dispatchEvent(
			new CustomEvent(BrowserMBoxEvent.PROGRESS, { detail: progress }),
		);
	}
}
