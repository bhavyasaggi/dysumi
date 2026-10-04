declare module "foliate-js/fb2.js" {
	export interface Fb2Person {
		name?: string;
	}

	export interface Fb2Section {
		linear?: string;
		createDocument: () => Document;
	}

	export interface Fb2Book {
		metadata: {
			title?: string;
			language?: string;
			author?: Array<Fb2Person | string>;
			description?: string | null;
		};
		sections: Fb2Section[];
		toc: Array<{ label?: string }>;
		destroy: () => void;
	}

	export function makeFB2(blob: Blob): Promise<Fb2Book>;
}
