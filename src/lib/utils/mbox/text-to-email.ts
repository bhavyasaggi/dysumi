import PostalMime, { type Email } from "postal-mime";

export interface ParsedEmail extends Email {
	raw?: string;
	offset?: number;
	offsetLength?: number;
}

/** Parse one RFC 822 message. Returns undefined when the text is empty or invalid. */
export async function textToEmail(
	text: string,
	offset = 0,
): Promise<ParsedEmail | undefined> {
	if (!text.trim()) return undefined;
	try {
		const email = await PostalMime.parse(text);
		return {
			...email,
			raw: text,
			offset,
			offsetLength: text.length,
		};
	} catch {
		return undefined;
	}
}
