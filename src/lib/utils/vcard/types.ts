export interface VCardField {
	label: string;
	value: string;
}

export interface VCard {
	id: string;
	name: string;
	photo: string;
	fields: VCardField[];
}
