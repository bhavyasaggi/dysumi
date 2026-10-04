import type { Address } from "postal-mime";

/** Indexed header row for one message inside an mbox or eml file. */
export interface MailSummary {
	id?: number;
	from?: Address;
	subject?: string;
	date?: string;
	messageId?: string;
	offset: number;
	offsetLength: number;
}
