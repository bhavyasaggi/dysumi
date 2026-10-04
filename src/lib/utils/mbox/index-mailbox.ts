import { textToEmail } from "./text-to-email";
import type { MailSummary } from "./types";
import { yieldToMain } from "./yield-to-main";

/**
 * Split an mbox into messages on `From ` separator lines and parse each one.
 * A single `.eml` file is one message and is not split.
 */
export async function indexMailbox(
	text: string,
	options?: {
		single?: boolean;
		chunkSize?: number;
		maxChunkSize?: number;
		onProgress?: (progress: number) => void;
	},
): Promise<MailSummary[]> {
	if (options?.single) {
		const email = await textToEmail(text, 0);
		options.onProgress?.(100);
		if (!email?.offsetLength) return [];
		return [summaryFrom(email)];
	}

	const messages: MailSummary[] = [];
	let pendingText = "";
	let pendingOffset = 0;
	const chunkSize = options?.chunkSize ?? text.length;
	const totalChunks = chunkSize ? Math.ceil(text.length / chunkSize) : 1;

	for (let index = 0; index < totalChunks; index += 1) {
		await yieldToMain();
		const start = index * chunkSize;
		const end = Math.min(start + chunkSize, text.length);
		const textWithPending = pendingText + text.slice(start, end);
		if (
			options?.maxChunkSize &&
			textWithPending.length > options.maxChunkSize
		) {
			throw new Error("Chunk size is too large");
		}

		const located = await locatePieces(
			textWithPending.split(/^From /gm),
			pendingOffset,
		);

		const pending = located.pop();
		pendingText = pending?.text ?? textWithPending;
		pendingOffset = pending?.offset ?? pendingOffset;

		for (const item of located) {
			await yieldToMain();
			const email = await textToEmail(item.text, item.offset);
			if (email?.offsetLength) messages.push(summaryFrom(email));
		}
		options?.onProgress?.(Math.floor(((index + 1) / totalChunks) * 90) + 10);
	}

	await yieldToMain();
	const pendingEmail = await textToEmail(pendingText, pendingOffset);
	if (pendingEmail?.offsetLength) messages.push(summaryFrom(pendingEmail));
	options?.onProgress?.(100);
	return messages;
}

async function locatePieces(
	pieces: string[],
	pendingOffset: number,
): Promise<{ offset: number; text: string }[]> {
	const located: { offset: number; text: string }[] = [];
	for (const [pieceIndex, piece] of pieces.entries()) {
		await yieldToMain();
		const previous = located[pieceIndex - 1];
		const currentOffset = previous
			? previous.offset + previous.text.length
			: pendingOffset;
		const messageText =
			previous && pieceIndex > 0 ? `From ${piece}` : piece || "";
		located.push({ offset: currentOffset, text: messageText });
	}
	return located;
}

function summaryFrom(email: {
	from?: MailSummary["from"];
	subject?: string;
	date?: string;
	messageId?: string;
	offset?: number;
	offsetLength?: number;
}): MailSummary {
	return {
		date: email.date,
		from: email.from,
		messageId: email.messageId,
		offset: email.offset ?? 0,
		offsetLength: email.offsetLength ?? 0,
		subject: email.subject,
	};
}
