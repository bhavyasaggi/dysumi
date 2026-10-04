export interface HttpRequest {
	method: string;
	url: string;
	headers: Record<string, string>;
	body: string;
	name?: string;
	title?: string;
	variables: Record<string, string>;
	/**
	 * Every variable value in scope for this request, including file variables
	 * and variables defined by earlier requests. Copying uses this map.
	 */
	variableScope?: Record<string, string>;
	meta: Record<string, string>;
}

export interface HttpFile {
	variables: Record<string, string>;
	requests: HttpRequest[];
}
