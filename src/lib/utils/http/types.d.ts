export interface HttpRequest {
	method: string;
	url: string;
	headers: Record<string, string>;
	body: string;
	name?: string;
	title?: string;
	variables: Record<string, string>;
	meta: Record<string, string>;
}

export interface HttpFile {
	variables: Record<string, string>;
	requests: HttpRequest[];
}
